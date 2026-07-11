# CLAUDE.md — Mafya RPG Projesi

> Omerta'dan ilham alan, 1950-60'lar temalı, çok şehirli 2D isometric
> web + mobil MMORPG. Tasarım kaynağı: `docs/GAME_DESIGN_ECONOMY.md` (GDD).
> Bu dosya, Claude Code'un projede çalışırken uyacağı kuralları tanımlar.

---

## 1. Proje Özeti

- **Tür:** Tarayıcı tabanlı MMORPG (mobil öncelikli responsive)
- **Tema:** 1950-60'lar Amerikan mafyası — Godfather/Boardwalk Empire estetiği
- **Çekirdek döngü:** Suç → kirli para → aklama → temiz para → ekipman/işletme
  → daha büyük suç. Detay: GDD Bölüm 1.
- **Ayırt edici özellikler:** gerçek zamanlı bildirimler (Socket.io),
  5 şehirli arbitraj ticareti, klan içi politika (sadakat + darbe),
  bölge savaşları (72 saatlik fazlı).

## 2. Teknoloji Yığını

| Katman | Teknoloji | Not |
|---|---|---|
| Oyun render | **Phaser 3** | Isometric harita, karakter, animasyon |
| UI shell | **React 18 + TypeScript** | Menüler, paneller, chat — Phaser'ı sarar |
| Stil | **Tailwind CSS** | Dark tema varsayılan (aşağıda tema tokenları) |
| API | **Node.js + Fastify + TypeScript** | REST + Socket.io aynı süreçte |
| ORM / DB | **Prisma + PostgreSQL** | Tüm kalıcı veri |
| Cache / timer | **Redis** | AP regen, cooldown, fiyat sayaçları, oturum |
| Gerçek zamanlı | **Socket.io** | Bildirimler, chat, savaş, çağrılar |
| Auth | **JWT (access + refresh)** | httpOnly cookie |
| Deploy | Client: Vercel / API+Redis+PG: Railway | |

## 3. Monorepo Yapısı

```
mafia-rpg/
├── CLAUDE.md
├── docs/
│   └── GAME_DESIGN_ECONOMY.md      # GDD — tüm mekanik kararların kaynağı
├── packages/
│   └── shared/                     # İki tarafın ortak kullandığı kod
│       ├── src/
│       │   ├── types/              # Zod şemaları + TS tipleri
│       │   ├── config/             # Oyun verisi (JSON): suçlar, işletmeler,
│       │   │   ├── crimes.json     #   mallar, şehirler, ekipman, aileler
│       │   │   ├── businesses.json
│       │   │   ├── goods.json
│       │   │   ├── cities.json
│       │   │   ├── equipment.json
│       │   │   └── npc-families.json
│       │   └── formulas/           # Saf fonksiyonlar: başarı %, dövüş,
│       │                           #   fiyat, sadakat — TEST EDİLEBİLİR
├── apps/
│   ├── server/
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── modules/            # Domain bazlı modüller (aşağıda)
│   │       ├── plugins/            # Fastify plugins (auth, redis, prisma)
│   │       ├── sockets/            # Socket.io event handler'ları
│   │       ├── jobs/               # Cron: fiyat güncelleme, aklama işleme,
│   │       │                       #   savaş fazı, event rotasyonu
│   │       └── index.ts
│   └── client/
│       └── src/
│           ├── game/               # Phaser: sahneler, sprite, harita
│           │   ├── scenes/
│           │   └── iso/
│           ├── components/         # React UI panelleri
│           ├── stores/             # Zustand state
│           ├── api/                # Typed API client
│           └── sockets/            # Socket.io client + event dinleyiciler
```

### Server modülleri (domain bazlı)

```
modules/
├── auth/          ├── crimes/        ├── economy/      # aklama, işletme
├── market/        # NPC dükkan + açık artırma
├── trade/         # şehirler arası mal ticareti + kaçakçılık kontrolleri
├── travel/        ├── pvp/           ├── jail/         # hapis + kaçırma
├── clans/         # roller, hazine, sadakat, görevler, darbe
├── territory/     # bölgeler, vergi, savaş fazları
├── reputation/    # NPC aile itibarı
├── casino/        ├── events/        # haftalık event rotasyonu
└── notifications/
```

Her modül: `routes.ts` + `service.ts` + `types.ts` (+ varsa `socket.ts`).

## 4. Mimari Kurallar (İhlal Etme)

1. **Tüm oyun formülleri `packages/shared/formulas/` içinde saf fonksiyon**
   olarak yaşar. Server bunları çağırır; client sadece ÖNİZLEME için kullanır
   ("%73 başarı" göstergesi). Otorite HER ZAMAN server'dadır.
2. **Client'a asla güvenme:** her aksiyon server'da doğrulanır
   (AP yeterli mi, cooldown bitti mi, oyuncu o şehirde mi, para yeterli mi).
3. **Tüm para hareketleri `Transaction` tablosuna yazılır** (kaynak, hedef,
   miktar, tip, timestamp). Bakiye asla doğrudan set edilmez; her değişiklik
   transaction kaydıyla birlikte Prisma `$transaction` içinde yapılır.
4. **Oyun verisi koda gömülmez:** yeni suç/mal/işletme eklemek =
   `shared/config/*.json` düzenlemek. Kod değişikliği gerektiriyorsa
   tasarım hatasıdır.
5. **Zaman bazlı her şey Redis'te:** AP regen (lazy hesaplama — her istekte
   `min(100, eski + geçenSüre/72)` hesapla, tick tutma), cooldown'lar
   (TTL'li key), hapis/hastane/seyahat bitiş zamanları (timestamp sakla,
   karşılaştır).
6. **Socket.io eventleri `shared/types/socket-events.ts`'de tipli tanımlanır**
   — hem server hem client aynı tip tanımını kullanır.
7. **RNG server-side `crypto.randomInt`** — asla `Math.random` (adil oyun +
   tahmin edilemezlik).
8. **Rate limiting:** tüm mutasyon endpoint'leri Fastify rate-limit ile
   korunur (varsayılan 30/dk; suç/PvP endpoint'leri kendi cooldown'una ek).

## 5. Veri Modeli Çekirdeği (Prisma — başlangıç şeması)

Ana tablolar (detaylar sprint 1'de netleşir):

```
Player        (id, username, level, xp, stats{str,agi,int,cha}, cityId,
               cleanMoney, dirtyMoney, apLastCalc, jailUntil, hospitalUntil,
               travelUntil, jailbreakSkill, clanId?, protectionUntil)
Clan          (id, name, level, treasury, avgLoyalty, ...)
ClanMember    (playerId, clanId, role[BABA|DANISMAN|REIS|ASKER], loyalty,
               joinedAt)
Territory     (id, cityId, type, ownerClanId?, taxRate)
Business      (id, ownerId|ownerClanId, type, level, territoryId,
               launderQueue, ...)
Reputation    (playerId, familyId, points)
InventoryItem (playerId, itemId, durability, equipped)
CargoLot      (playerId, goodId, qty, boughtCityId, boughtPrice)
Transaction   (id, fromId?, toId?, amount, currency[CLEAN|DIRTY], type, meta)
War           (id, attackerClanId, defenderClanId, territoryId, phase,
               attackerPoints, defenderPoints, endsAt)
Assignment    (clanId, targetPlayerId, spec{json}, reward, status)
HitContract   (id, posterId(anonim), targetId, bounty, status)
CityGoodPrice (cityId, goodId, currentPrice, demand24h)
```

## 6. Tema & UI Tokenları

Yasin'in tercih ettiği dark/modern estetik + dönem havası:

```
Arka plan   : #0d0d10 (koyu), paneller #16161c
Vurgu 1     : #c9a227 (eskitilmiş altın — dönem hissi, para/premium)
Vurgu 2     : #8b1e2d (bordo — tehlike/PvP/savaş)
Vurgu 3     : #6366f1 (indigo — bilgi/nötr aksiyonlar)
Metin       : #e8e6e1 birincil, #9b988f ikincil
Font        : başlıklar için dönem serif (örn. 'Playfair Display'),
              gövde 'Inter'
```

- Tüm UI Türkçe. i18n altyapısı kur (`tr` varsayılan) ama ilk sürüm tek dil.
- Mobil öncelikli: alt tab bar (Şehir/Suç/Pazar/Klan/Profil), paneller
  bottom-sheet olarak açılır.

## 7. Sprint Planı (8 sprint × ~1 hafta)

| Sprint | Kapsam | Bitince oynanabilir mi? |
|---|---|---|
| **S1 — İskelet** | Monorepo kurulum, Prisma şema, auth (kayıt/giriş), Player modeli, AP sistemi (Redis lazy regen), boş şehir ekranı | Giriş yapıp AP'nin dolduğunu görürsün |
| **S2 — Suç döngüsü** | crimes.json + formüller (shared), suç işleme endpoint + UI, hapis + rüşvet, transaction log | ✅ İlk oynanabilir döngü: suç → kirli para |
| **S3 — Ekonomi** | İşletme satın alma/yükseltme, aklama kuyruğu (cron), NPC ekipman pazarı + dayanıklılık, dinamik fiyat cron'u | Tam para döngüsü döner |
| **S4 — Şehirler & Ticaret** | 5 şehir, seyahat sistemi, mal alım-satımı, şehir bazlı fiyat, kaçakçılık kontrol noktası + rüşvet anı | Arbitraj oyunu açılır |
| **S5 — PvP & Hapis sosyal** | Dövüş sistemi, yağma, hastane, koruma kuralları, misilleme, hapisten kaçırma + uzmanlık | Oyuncular etkileşir |
| **S6 — Klanlar** | Klan CRUD, roller, hazine, sadakat, Baba görevlendirmeleri, bağış, ortak işletme | Sosyal çekirdek hazır |
| **S7 — Bölge & Savaş** | Territory sahiplik, vergi, savaş ilanı + 72 saat kontrol puanı fazı (cron), yardım çağrıları (Socket.io), Baba suikasti | Endgame açılır |
| **S8 — İçerik & Cila** | Kumarhane oyunları, NPC aile itibarı + kontratlar, haftalık event altyapısı (ilk 2 event), onboarding/tutorial, Phaser isometric şehir sahnesi cilası | 🚀 Kapalı beta adayı |

**Sprint kuralı:** Her sprint sonunda oyun deploy edilir ve elle test edilir.
Phaser görsel katmanı S1-S7 boyunca basit placeholder (renkli tile) olabilir;
mekanik önce, görsel sonra.

## 8. Test Stratejisi

- **`shared/formulas/` %100 unit test** (Vitest) — başarı %, dövüş, fiyat,
  sadakat formülleri deterministik test edilir (RNG enjekte edilir).
- Ekonomi simülasyonu: `scripts/simulate-economy.ts` — 1000 sanal oyuncu ×
  30 gün simüle et, para arzı grafiğini kontrol et (enflasyon frenleri
  çalışıyor mu). Her büyük balans değişikliğinde çalıştır.
- API entegrasyon testleri kritik akışlar için: suç işleme, aklama,
  para transferi, savaş puanı.

## 9. Komutlar

```bash
pnpm dev            # client + server birlikte (turbo)
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # config JSON'larından şehir/bölge/NPC seed
pnpm test           # vitest (shared + server)
pnpm simulate       # ekonomi simülasyonu
```

## 10. Claude Code Çalışma Kuralları

- Mekanik bir değer/kural gerektiğinde ÖNCE `docs/GAME_DESIGN_ECONOMY.md`'ye
  bak — sayılar orada tanımlı, uydurma.
- GDD'de olmayan bir tasarım kararı gerekirse: kodu yazmadan önce kararı
  Yasin'e sor, sonra GDD'ye de işle.
- Her yeni modül: önce Prisma şema + shared tipler + formüller (test ile),
  sonra service, sonra route, en son UI.
- Commit mesajları Türkçe, conventional format: `feat(crimes): suç işleme endpoint'i`
- TypeScript strict mode; `any` yasak (zorunluysa `// TODO(any):` notu).

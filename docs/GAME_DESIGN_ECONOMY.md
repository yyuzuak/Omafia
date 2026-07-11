# Mafya RPG — Suç & Ekonomi Tasarım Dokümanı

> Omerta'dan ilham alan, modern 2D isometric web tabanlı mafya RPG'sinin
> suç ve ekonomi sistemleri tasarımı.
> Sürüm: v0.1 — Temmuz 2026

---

## 1. Genel Bakış: Para Döngüsü

```
Suç (kirli ₺ üretimi)
   ↓
Aklama tesisleri (kayıp: %10-30 → para yakma)
   ↓
Temiz ₺
   ↓
Harcama: Ekipman pazarı / Mülk / Klan hazinesi
   ↓
Dayanıklılık aşınması → Tamir & yenileme (para yakma)
   ↓
Daha iyi ekipman → Daha zor suçlar → Daha çok kirli ₺ ...
```

**Enflasyon frenleri (para yakma noktaları):**
- Aklama kaybı (%10-30)
- Ekipman tamiri (fiyatın %30'u)
- Rüşvet (hapisten çıkış)
- Açık artırma komisyonu (%5)
- Sabit arzlı nadir itemler (üst segment para emici)
- Kumarhane kasa avantajı (%2-8, Bölüm 10)

---

## 2. Suç Sistemi

### 2.1 Suç Katmanları

| Seviye | Örnek | Yakalanma | Ödül | Gereksinim |
|---|---|---|---|---|
| Sokak | Yankesicilik, araba çalma | %5-10 | Düşük, sabit | Yok |
| Orta | Mağaza soygunu, kaçakçılık | %15-25 | Orta | Min. level |
| Ağır | Banka soygunu, kasa kırma | %30-50 | Yüksek | Ekip (2-5 kişi) |
| Organize | Liman op., silah kaçakçılığı | Çok yüksek | Çok yüksek + itibar | Klan + bölge |

### 2.2 Başarı Formülü

```
Stat Skoru      = (Stat1 × Ağırlık1 + Stat2 × Ağırlık2) / statThreshold
Ekipman Bonusu  = ilgili aletin % bonusu
İtibar Bonusu   = min(İlgili Aile İtibarı / 100, %15)   // üst sınırlı

Ham Başarı %    = %20 (baz) + (Stat Skoru × %50) + Ekipman + İtibar − Zorluk Cezası
Final %         = clamp(Ham Başarı, %5, %95)
```

- **Zorluk cezası:** Sokak 0 / Orta −10 / Ağır −20 / Organize −30
- **Şeffaflık:** Oyuncuya net "%73 başarı şansı" gösterilir; detay
  breakdown açılır menüde (Stat +38, Ekipman +8, İtibar +5, Zorluk −20, Baz +20).
- Her suç farklı stat kombinasyonu ister → build çeşitliliği:
  - Soygun → Çeviklik 0.6 + Zeka 0.4
  - Kaçakçılık → Karizma 0.5 + Güç 0.5
  - Kasa Kırma → Zeka 0.7 + Çeviklik 0.3
  - Liman Op. → Güç 0.5 + Karizma 0.3 + İtibar 0.2

### 2.3 Başarısızlık Sonuçları

| Katman | Ceza |
|---|---|
| Sokak | Sadece ödül kaybı |
| Orta/Ağır | Hapis (gerçek zamanlı sayaç) — rüşvetle erken çıkış (para yakma) |
| Organize | Hapis + itibar kaybı + tüm ekip etkilenir (`crewAffected`) |

### 2.4 Spam Kontrolü (iki katman)

1. **Suç bazlı cooldown** (`cooldownSeconds`)
2. **Aksiyon Puanı havuzu** (`actionPointCost`) — Redis ile saniye bazlı regen

### 2.5 Mini-oyun (opsiyonel katman)

Ağır suçlarda reaction-timing mini oyunu; mükemmel zamanlama +%5 başarı bonusu.

### 2.6 Suç Tanım Şeması (JSON)

```json
{
  "crimes": [
    {
      "id": "pickpocket",
      "name": "Yankesicilik",
      "tier": "street",
      "stats": { "agility": 0.7, "intelligence": 0.3 },
      "statThreshold": 20,
      "difficultyPenalty": 0,
      "reward": { "min": 50, "max": 150, "currency": "dirty" },
      "cooldownSeconds": 60,
      "actionPointCost": 5,
      "failure": { "jailSeconds": 0, "reputationLoss": 0 },
      "requirements": { "minLevel": 1, "crew": null, "territory": null },
      "location": "street_corner"
    },
    {
      "id": "store_robbery",
      "name": "Mağaza Soygunu",
      "tier": "mid",
      "stats": { "agility": 0.6, "intelligence": 0.4 },
      "statThreshold": 60,
      "difficultyPenalty": 10,
      "reward": { "min": 400, "max": 1200, "currency": "dirty" },
      "cooldownSeconds": 300,
      "actionPointCost": 15,
      "failure": { "jailSeconds": 180, "reputationLoss": 0 },
      "requirements": { "minLevel": 5, "crew": null, "territory": null },
      "location": "shopping_district"
    },
    {
      "id": "safe_cracking",
      "name": "Kasa Kırma",
      "tier": "heavy",
      "stats": { "intelligence": 0.7, "agility": 0.3 },
      "statThreshold": 120,
      "difficultyPenalty": 20,
      "reward": { "min": 3000, "max": 8000, "currency": "dirty" },
      "cooldownSeconds": 1800,
      "actionPointCost": 30,
      "failure": { "jailSeconds": 900, "reputationLoss": 5 },
      "requirements": { "minLevel": 15, "crew": { "min": 2, "max": 4 }, "territory": null },
      "location": "bank_district",
      "minigame": "reaction_timing"
    },
    {
      "id": "port_operation",
      "name": "Liman Operasyonu",
      "tier": "organized",
      "stats": { "strength": 0.5, "charisma": 0.3, "reputation": 0.2 },
      "statThreshold": 250,
      "difficultyPenalty": 30,
      "reward": { "min": 15000, "max": 40000, "currency": "dirty" },
      "cooldownSeconds": 7200,
      "actionPointCost": 50,
      "failure": { "jailSeconds": 3600, "reputationLoss": 20, "crewAffected": true },
      "requirements": { "minLevel": 30, "crew": { "min": 3, "max": 5 }, "territory": "port" },
      "location": "port"
    }
  ]
}
```

### 2.7 Gelir Kalibrasyonu (saatlik maksimum, referans değerler)

| Suç | Yaklaşık kirli ₺/saat |
|---|---|
| Yankesicilik | ~2.000 (AP sınırlı) |
| Kasa Kırma | ~6.600 |
| Liman Operasyonu | ~7.500 + itibar |

Üst katman suçlar daha kazançlı ama ekip + bölge + klan gerektirir →
sosyal oyunu ödüllendiren eğri.

---

## 3. İşletme & Aklama Sistemi

### 3.1 İşletme Türleri

| İşletme | Fiyat (temiz ₺) | Kapasite/saat | Aklama Oranı | Pasif Gelir/saat |
|---|---|---|---|---|
| Çamaşırhane | 25.000 | 1.500₺ | %70 | 100₺ |
| Bar | 75.000 | 4.000₺ | %75 | 350₺ |
| Restoran | 200.000 | 9.000₺ | %80 | 900₺ |
| Kumarhane | 600.000 | 25.000₺ | %85 | 3.000₺ |
| Gece Kulübü | 1.500.000 | 60.000₺ | %90 | 8.000₺ |

**Kalibrasyon ilkeleri:**
- Kapasiteler bilinçli olarak suç gelirinin altında → sürekli "kapasite açlığı",
  büyüme motivasyonu.
- İlk işletme (25.000₺) yeni oyuncunun ~1 haftalık milestone'u.
- Aklama oranı farkı = para yakma = enflasyon freni.

### 3.2 Seviye Sistemi

| Yükseltme | Maliyet | Etki |
|---|---|---|
| Sv.1 → Sv.2 | Fiyatın %50'si | Kapasite +%50, oran +%3 |
| Sv.2 → Sv.3 | Fiyatın %100'ü | Kapasite +%100 (toplam), oran +%5 (toplam) |

### 3.3 Aklama Akışı

```
Kirli para yatır → kuyruğa girer → saatlik kapasite kadar işlenir
(gerçek zamanlı, Redis timer) → temiz para hesaba geçer
```

- **Kuyruk limiti:** kapasitenin 24 katı (günde 1 giriş yeterli — mobil dostu).
- **Bölge vergisi:** işletmenin bulunduğu bölgeyi kontrol eden klan,
  aklama işleminden %2-5 pay alır. Kendi klan bölgesinde vergi yok →
  işletme konumu stratejik karar.

### 3.4 Risk: Polis Baskını

- "Hızlı aklama" (2x hız) → %10/gün baskın riski.
- Baskın: kuyruktaki kirli paranın %50'si kaybolur + işletme 12 saat kapalı.
- Normal hızda baskın yok — risk tamamen oyuncu tercihi.

### 3.5 İşletme Şeması (JSON)

```json
{
  "id": "bar",
  "name": "Bar",
  "purchasePrice": 75000,
  "launderingCapacityPerHour": 4000,
  "launderingRate": 0.75,
  "passiveIncomePerHour": 350,
  "queueLimitMultiplier": 24,
  "upgrades": [
    { "level": 2, "cost": 37500, "capacityMult": 1.5, "rateBonus": 0.03 },
    { "level": 3, "cost": 75000, "capacityMult": 2.0, "rateBonus": 0.05 }
  ],
  "rushLaundering": { "speedMult": 2, "raidChancePerDay": 0.10 },
  "maxOwnedPerPlayer": 3
}
```

- **`maxOwnedPerPlayer: 3`** → tek oyuncunun ekonomi dominasyonunu engeller;
  daha fazlası için klan ortak işletmeleri (klan sistemine bağlantı noktası).

---

## 4. Ekipman Pazarı & Dinamik Fiyatlama

### 4.1 Ekipman Kategorileri

| Kategori | İşlev | Örnek |
|---|---|---|
| Silah | PvP saldırı | Tabanca, Pompalı, SMG |
| Zırh | PvP savunma | Yelek, Ağır Zırh |
| Araç | Suç bonusu + kaçış şansı | Motosiklet, Kamyonet |
| Alet | Suça özel % bonus | Maymuncuk (+kasa %8), Telsiz (+ekip %5) |

### 4.2 Dayanıklılık (Sürdürülebilir Talep)

- Her ekipmanın dayanıklılık puanı var (örn. tabanca: 100 kullanım).
- Her kullanım 1 puan düşürür; %25 altında bonus yarıya iner.
- Tamir = fiyatın %30'u (para yakma) — ya da yenisini al.

### 4.3 Dinamik Fiyat Formülü

```
Fiyat = BazFiyat × (1 + (Talep − Arz Dengesi) × 0.002)
clamp: BazFiyat × 0.7  …  BazFiyat × 1.5
```

- Talep = son 24 saatteki satın alma adedi.
- Saatte bir güncelleme (Redis sayaç + cron) — gerçek zamanlı tick gereksiz.
- ±%30-50 bant → manipülasyon sınırlı ama piyasa "canlı".

### 4.4 İki Pazar Katmanı

1. **NPC Dükkanı** — standart ekipman, dinamik fiyat, sınırsız stok
   (taban likidite garantisi).
2. **Oyuncu Pazarı (Açık Artırma)** — nadir itemler; yalnızca organize suç
   drop'ları ve haftalık eventlerden gelir (sabit arz). Komisyon %5 = para yakma.

### 4.5 Nadir Item Şeması (JSON)

```json
{
  "id": "golden_lockpick",
  "name": "Altın Maymuncuk",
  "rarity": "legendary",
  "source": "port_operation_drop",
  "dropChance": 0.02,
  "effect": { "crimeBonus": { "safe_cracking": 0.15 } },
  "durability": 500,
  "tradeable": true
}
```

---

## 5. Klan (Aile) & Bölge Kontrol Sistemi

### 5.1 Klan Rol Hiyerarşisi

| Rol | Kişi | Yetkiler |
|---|---|---|
| **Baba** | 1 | Her şey: savaş ilanı, ittifak, vergi oranı, üye atma/rol değiştirme, hazine çekme |
| **Danışman** | 1 | Baba'nın tüm yetkileri (hazine çekme hariç), diplomasi mesajları |
| **Reis** | 3-5 | Kendi ekibine (asker grubu) operasyon başlatma, üye davet |
| **Asker** | sınırsız | Klan suçlarına katılım, bölge savunması |

- **Klan kurma maliyeti:** 500.000₺ temiz para (spam klan engeli + para yakma).
- **Üye kapasitesi:** 20 → klan seviyesiyle 50'ye kadar
  (klan XP = üyelerin organize suç katılımlarından birikir).

### 5.2 Bölge (Territory) Sistemi

Harita 12-16 bölgeye ayrılır (şehir büyüdükçe genişler):

| Bölge tipi | Gelir | Stratejik değer |
|---|---|---|
| Liman | Yüksek vergi + organize suç erişimi | En değerli — savaş odağı |
| İş bölgesi (banka/AVM) | Orta-yüksek (çok işletme = çok aklama vergisi) | Ekonomik güç |
| Konut mahallesi | Düşük | Yeni klan başlangıç noktası |
| Sanayi | Orta + kaçakçılık rotası bonusu | Orta katman |

**Bölge geliri:** bölgedeki tüm aklama işlemlerinden %2-5 vergi
(oran Baba tarafından ayarlanır) → klan hazinesi.

**Vergi meta oyunu:** yüksek vergi kısa vadede kazandırır ama işletmeler
düşük vergili bölgelere taşınır (taşıma maliyeti: işletme fiyatının %10'u).
Bölge sahibi "vergi cenneti olup işletme çekmek" ile "sağmak" arasında
denge kurar — oyuncu güdümlü ekonomik meta.

### 5.3 Bölge Ele Geçirme (Klan Savaşı)

```
1. SAVAŞ İLANI (Baba)
   Maliyet: 100.000₺ (para yakma) + 48 saat hazırlık
   → savunan klana anlık bildirim (Socket.io)

2. ÇATIŞMA FAZI (72 saat) — kontrol puanı mücadelesi:
   • Bölgedeki suçlar kontrol puanı üretir (her iki taraf)
   • O bölgedeki PvP galibiyetleri yüksek kontrol puanı verir
   • Sabotaj: rakip klanın bölgedeki işletmelerine baskın

3. SONUÇ:
   • Saldıran %60+ kontrol puanına ulaşırsa bölge el değiştirir
   • Ulaşamazsa: 7 gün aynı bölgeye tekrar savaş açamaz
```

- 72 saatlik faz → farklı saat dilimlerindeki oyuncular katılabilir.
- **Savunan avantajı:** kontrol puanı üretiminde +%15 bonus (statüko koruması).

### 5.4 Klan Hazinesi & Ortak İşletmeler

- **Hazine girişi:** bölge vergileri + üye bağışları + organize suç klan payı
  (%10 otomatik kesinti).
- **Ortak işletmeler:** klan, hazineyle bireysel limitin (3) üzerinde işletme
  alabilir — yalnızca kendi kontrol ettiği bölgelerde; gelir hazineye akar.
  Bölge kaybedilirse ortak işletme **dondurulur** (yeni sahip el koyamaz,
  eski sahip kullanamaz → geri alma motivasyonu).
- **Hazine çekme:** sadece Baba + 48 saat bekleme + tüm üyelere bildirim
  ("Baba parayı alıp kaçtı" senaryosuna şeffaflık — ama ihanet mümkün).

### 5.5 İttifak & İhanet

- İttifak: birbirinin bölgesinde vergisiz aklama + savaşta kontrol puanı desteği.
- İttifak bozma: **24 saat bildirim süresi** — bu sürede gizli savaş hazırlığı
  yapılabilir (ilan maliyeti önceden ödenir). İhanet mümkün ama planlama ister.

---

## 6. PvP Dövüş Sistemi

### 6.1 Dövüş Gücü Hesabı

```
Saldırı Gücü (SG) = (Güç × 0.5 + Çeviklik × 0.3 + Zeka × 0.2)
                    × Silah Çarpanı × Dayanıklılık Faktörü

Savunma Gücü (VG) = (Çeviklik × 0.4 + Güç × 0.4 + Zeka × 0.2)
                    × Zırh Çarpanı × Dayanıklılık Faktörü
```

- **Silah/Zırh çarpanı:** 1.0 (çıplak) → 2.5 (en üst kademe tavan).
  Ekipman önemli ama stat'ları ezmez — "parayla kazanma" sınırı.
- **Dayanıklılık faktörü:** ekipman %25 altındaysa çarpanın yarısı işler
  (ekonomideki aşınma sistemiyle tutarlı).

### 6.2 Sonuç Hesabı

```
Güç Oranı  = SG / (SG + VG)
Kazanma %  = clamp(Güç Oranı × 100, %15, %85)
```

- Suç formülüyle aynı felsefe: %15-85 bandı — her zaman risk/şans payı.
- Tek RNG çekilişi, anında sonuç (Phaser'da kısa dövüş animasyonu, mekanik
  olarak tek hesap).
- **Saldırı maliyeti:** 20 AP (spam saldırıyı AP havuzu sınırlar).

### 6.3 Sonuçlar

| Taraf | Etki |
|---|---|
| Kazanan | Kaybedenin üzerindeki **kirli parasının %20'si** + itibar puanı |
| Kaybeden | Para kaybı + hastane süresi (10-30 dk) — suç işleyemez |
| İkisi de | Silah/zırh dayanıklılık kaybı (ekonomiye talep) |

- **Sadece kirli para yağmalanabilir** — temiz/banka parası güvende.
  → "kirli parayı hızlı akla" baskısı, aklama sistemine sürekli akış,
  yeni oyuncu birikimi korunur.

### 6.4 Koruma Mekanizmaları

- **Yeni oyuncu koruması:** Level 10 altına saldırılamaz.
- **Seviye bandı:** ±%30 dışına saldırı yağma/itibar getirmez.
- **Misilleme penceresi:** saldırıya uğrayan 24 saat içinde seviye bandı
  kuralı olmadan misilleme yapabilir (anlık Socket.io bildirimi).
- **Hastane dokunulmazlığı:** hastanedeki oyuncuya saldırılamaz.

### 6.5 Klan Savaşı Entegrasyonu (Kontrol Puanı)

```
Kontrol Puanı = 10 × (Kaybedenin Leveli / Kazananın Leveli)
```

- Denk/üst rakip yenmek tam puan, düşük seviye ezmek kırıntı → savaşta
  farm engellenir.
- Savunan klan üyeleri +%15 kontrol puanı bonusu (savunan avantajıyla tutarlı).
- Savaş PvP'sinde seviye bandı gevşer (±%50); misilleme penceresi aynen işler.

---

## 7. Bağlantı Noktaları (Diğer Sistemlere)

| Bu doküman | Bağlandığı sistem |
|---|---|
| Bölge vergisi, organize suç `territory` şartı | ✅ Klan / Bölge sistemi (Bölüm 5) |
| Silah/zırh statları | ✅ PvP dövüş sistemi (Bölüm 6) |
| Klan ortak işletmeleri | ✅ Klan hazinesi (Bölüm 5.4) |
| `crewAffected`, ekip suçları | Sosyal / ihanet mekanikleri (kısmen 5.5) |
| İtibar bonusu | ✅ Aile bazlı itibar sistemi (Bölüm 8) |

---

## 8. Aile Bazlı İtibar Sistemi

### 8.1 NPC Aileleri

Şehirde 4 NPC ailesi (oyuncu klanlarından bağımsız kurulu düzen):
**Marino, Falcone, Bruno, Costa**. Her oyuncunun her aileyle ayrı itibar
puanı vardır (0-1000).

**Düşman çiftler:** Marino ↔ Falcone, Bruno ↔ Costa.
Bir ailede kazanılan her +10 itibar, düşmanında −3 yaratır →
4 aileyle aynı anda maksimum itibar matematiksel olarak imkansız.
Oyuncu taraf seçer → build çeşitliliğinin sosyal katmanı.

### 8.2 Kazanım / Kayıp Kuralları

| Eylem | İtibar Etkisi |
|---|---|
| Ailenin bölgesinde başarılı küçük suç | +1~3 ("haraç payı" göz yumması) |
| Aile kontratı (NPC görevi) tamamlama | +10~30 |
| Organize suç (aile ortaklığında) | +20~50 |
| Ailenin bölgesinde suçta yakalanma | −5~15 |
| Ailenin işletmesine/adamına saldırı | −30~80 |
| Rakip aileyle kontrat | düşman ailede −10 |

**Decay yok:** itibar zamanla düşmez, yalnızca eylemle düşer
(offline oyuncu cezalandırılmaz — mobil dostu felsefe).

### 8.3 İtibar Kademeleri (aile başına)

```
0-99      Yabancı      — bonus yok
100-299   Tanıdık      — ailenin bölgesinde suç bonusu +%2
300-599   Güvenilir    — aile kontratlarına erişim, suç bonusu +%5
600-899   Aile Dostu   — organize suç itibar bonusu tam işler (%15 tavan)
900-1000  Onursal Üye  — ailenin özel tüccarı (nadir item mağazası) açılır
```

---

## 9. Aksiyon Puanı (AP) Kalibrasyonu

```
Maksimum havuz : 100 AP
Regen          : 1 AP / 72 sn (≈ 50 AP/saat, tam dolum 2 saat)
Offline regen  : aynen işler (çevrimdışı cezası yok)
Satın alma     : YOK — AP parayla alınamaz (pay-to-win kapısı kapalı)
```

### 9.1 Günlük Oyun Bütçesi

| Oyuncu tipi | Günlük AP | Kapasite |
|---|---|---|
| Casual (günde 2 giriş) | ~400 AP | ~15 orta suç veya 8 ağır suç + birkaç PvP |
| Hardcore (havuz taşırmıyor) | ~1.200 AP | Tam suç rotasyonu + aktif PvP + savaş |

- Hardcore/casual farkı 3x — avantaj var ama kopuş yok
  (Omerta'nın en büyük şikayeti: sürekli online olmayan rekabetten kopuyordu).
- Havuz 100 AP → taşma kaybı günde 2-3 kısa girişi teşvik eder, zorlamaz.

### 9.2 Çapraz Kontrol (suç maliyetleriyle)

- Yankesicilik 5 AP → saatte 10 = 50 AP ✓ regen ile başa baş
- Liman Operasyonu 50 AP → yarım havuz ✓ "günün ana etkinliği" hissi

---

## 10. Kumarhane Oyunları

### 10.1 NPC Kumarhanesi (kasa = sistem)

| Oyun | Mekanik | Kasa Avantajı |
|---|---|---|
| Zar | Hızlı, tek tık | %3 |
| Blackjack | Basit kart mantığı, hafif beceri | %2 (iyi oyunla %1) |
| Rulet | Klasik, yüksek risk/ödül seçenekleri | %5 |
| Yarış bahisi | 30 dk'da bir NPC yarışı | %8 |

- **Kasa avantajı = para yakma** → enflasyon freni listesine eklenir.
- **Sadece temiz para** ile oynanır — kirli para kumarhaneye giremez
  (aklama sistemini baypas etmesin; kritik kural).
- **Günlük bahis limiti:** 50.000₺ veya servetin %20'si (düşük olan) —
  tek gecede sıfırlanma döngüsü engellenir.

### 10.2 Oyuncu Kumarhaneleri (kasa = işletme sahibi)

- Kumarhane işletmesi sahibi kendi masalarını açar: kasa avantajının
  %50'si sahibe, %50'si yakılır.
- Kumarhaneyi diğer işletmelerden farklı kılar: pasif gelir + aklama +
  kumar geliri üçlüsü.
- Sahip masa limitlerini (min/max bahis) belirler — yüksek limitli
  masalar zengin oyuncuları çeker.

---

## 11. Haftalık Event Tasarımı

Rotasyonlu 4 event (her hafta biri, ayda tam tur):

| Event | Mekanik | Ödül |
|---|---|---|
| **Büyük Vurgun** | 48 saat sunucu geneli ortak hedef | Katkı sırasına göre nadir item + kirli ₺ |
| **Kaçakçılık Konvoyu** | Haritadaki NPC konvoyuna klan saldırıları | Klan hazinesine ödül + nadir item |
| **Poker Turnuvası** | Katılım ücretli (ücretlerin %10'u yakılır) | Ödül havuzu + kozmetik unvan |
| **Aile Savaşı** | Zayıflayan NPC ailesinin kontratları 2x itibar | İtibar yarışı, sıralama ödülleri |

- Nadir item **tek kaynağı**: organize suç dropları + eventler (sabit arz).
- Eventler Socket.io ile duyurulur → "sunucuda şu an bir şey oluyor" hissi.

---

## 12. Onboarding (İlk 1 Saat)

```
0-5 dk   : Karakter oluşturma → kısa intro (şehre yeni gelen göçmen)
           → İLK SUÇ hemen (yankesicilik, %95 garantili tutorial)
5-15 dk  : 3 suç → ilk kirli para → NPC rehber aklama kavramını anlatır
           → tutorial çamaşırhanesi (ücretsiz, düşük kapasite) ile ilk aklama
15-30 dk : İlk ekipman → stat dağıtımı (build seçimi)
           → harita keşfi (3 bölge ziyareti)
30-60 dk : İlk NPC aile kontratı (itibar girişi)
           → "klana katıl veya devam et" yol ayrımı
```

- **Tutorial çamaşırhanesi** kritik: gerçek işletme 1 haftalık hedef
  olduğundan, oyuncunun en özgün mekaniği (aklama) 1. gün deneyimlemesi şart.
- Level 10 PvP koruması = onboarding'in doğal güvenli alanı.
- İlk 3 gün "yeni gelen bonusu": +%50 AP regen.

---

## 13. Çok Şehirli Dünya & Seyahat

### 13.1 Şehirler (başlangıç: 5)

| Şehir | Karakter | Ucuz | Pahalı |
|---|---|---|---|
| **New Haven** | Finans + liman, en büyük pazar | — | Her şey (yüksek talep) |
| **Porto Vecchio** | İthalat kapısı | Viski, puro, şarap | Silah |
| **Las Sombras** | Kumar başkenti | — | Alkol, lüks mal |
| **Ironville** | Sanayi | Silah, araç parçası | Puro, lüks içki |
| **Bayou City** | Güney kapısı (Küba rotası) | Rom, puro | Silah, ilaç |

### 13.2 Seyahat Mekaniği

| Araç | Maliyet | Süre | Kargo | Risk |
|---|---|---|---|---|
| Tren | Ucuz | Yavaş (15-20 dk) | Orta | Düşük |
| Araba (kendi aracın) | Yakıt | Orta (10-15 dk) | Araca bağlı | Orta |
| Uçak | Pahalı | Hızlı (5 dk) | Düşük | Düşük |

- Seyahat gerçek zamanlı (mobilde "yolda" bildirimi) — anlık ışınlanma yok,
  arbitraj spam'i doğal sınırlanır.
- Seyahatte saldırıya uğranmaz, suç da işlenemez.
- İşletme ve itibar **şehir bazlı** → doğal "ana şehir" seçimi oluşur.

---

## 14. Mal Ticareti & Kaçakçılık (Arbitraj)

### 14.1 Dönem Malları

| Mal | Kategori | Not |
|---|---|---|
| Viski, şarap, rom | İçki | Eyalet vergi farkı = kâr marjı |
| Küba purosu | Lüks | Ambargo teması: Bayou City'den girer, kuzeyde 3-4x |
| Sigara | Hacim | Düşük marj, yüksek hacim — yeni oyuncu dostu |
| Silah | Yasak | En yüksek marj, en yüksek risk |
| Çalıntı mücevher/sanat | Nadir | Soygun dropu, sadece karaborsa |
| Reçeteli ilaç | Yasak | Orta-yüksek marj |

### 14.2 Şehir Bazlı Dinamik Fiyat

Mevcut dinamik fiyat formülünün şehir bazlı versiyonu.
**Oyuncu satışları o şehirde fiyatı düşürür** → popüler rota marjı erir,
oyuncular yeni rota arar. Kendi kendini dengeleyen arbitraj.

### 14.3 Kaçakçılık Riski (Yol Kontrolü)

```
Yakalanma % = Baz risk (mal yasallığı: %5-25)
              × Kargo miktarı çarpanı
              − Araç bonusu (gizli bölmeli araçlar)
              − İtibar bonusu (o şehrin ailesiyle arası iyiyse yol açık)

Yakalanma: kargo tamamen gider + para cezası; yasak mallarda hapis
```

**Rüşvet anı:** yakalanınca anlık karar — kargo değerinin %40'ı rüşvet
(para yakma) ya da kargoyu kaybet. Mini risk/ödül kararı.

---

## 15. Dönem Aktiviteleri Kataloğu (1950-60'lar)

Mevcut sistemlere entegre edilen dönem içerikleri:

| Aktivite | Entegrasyon |
|---|---|
| **Haraç** (protection racket) | Bölge sahibi klan NPC dükkanlarından haftalık haraç (bölge gelirine ek); bireysel "haraç topla" orta katman suçu |
| **Tefecilik** (loan sharking) | Oyuncular arası faizli borç + tahsildar mekaniği (PvP'de borçludan tahsilat önceliği); NPC tefeci = acil nakit, fahiş faiz (para yakma) |
| **Sayısal loto** (numbers racket) | Bölge sahibi klan kendi lotosunu işletir: NPC mahallelisi otomatik oynar (pasif gelir), oyuncular kupon alabilir |
| **Maç şikesi** (boks) | Haftalık NPC boks maçları + bahis; yüksek itibarlı klan şike karıştırabilir (pahalı, riskli, bahis avantajı) |
| **Sendika sızması** | Liman/sanayi bölgesi sahibi klan "sendika kontrolü" yatırımı → bölgeden geçen kaçakçılık kargolarından pay |
| **Kalpazanlık** | Ağır suç kategorisine tek seferlik yüksek risk/ödül suçu olarak (üçüncü para tipi YOK — karmaşıklık freni) |
| **Araba hırsızlığı zinciri** | Çalıntı araç → Ironville'de parçalanır → şehirler arası mal akışına bağlanır |
| **Yolsuzluk ağı** | Kalıcı yatırım: polis şefi/yargıç "maaşa bağlanır" (haftalık gider) → hapis −%30, baskın ve kontrol noktası riski düşer; şehir bazlı |
| **Kasa tırtıklama** (skimming) | Las Sombras'a özel: klan NPC kumarhanesine ortak olur, kasadan pay alır; yüksek itibar + büyük yatırım gerekir |
| **Gece hayatı koruması** | İşletmelere "güvenlik" satışı — oyuncular arası B2B: koruyan klan o işletmenin baskın/sabotaj riskini düşürür |
| **Kiralık iş** (hit contract) | Anonim ilan panosu: ödül koyan parayı yatırır, hedefi yenen ilk oyuncu alır; misilleme/ihanet metasını besler |

**Tema sınırı:** Dönemin bazı gerçek faaliyetleri (insan ticareti vb.)
bilinçli olarak kapsam dışı — oyun "suç romantizmi" tonunda kalır
(Godfather / Boardwalk Empire estetiği).

---

## 16. Hapisten Kaçırma & Uzmanlık

- Hapisteki herhangi bir oyuncu kaçırılabilir (klandaş şartı yok) —
  hapishane ekranında "kaçır" listesi.

```
Kaçırma % = Baz %25 + (Zeka × 0.5 + Çeviklik × 0.5 katkısı)
            + Kaçırma Uzmanlığı bonusu − Hedefin kalan süre cezası
clamp: %5 - %90
Başarısızlık: kaçıran da hapse girer (hedefin kalan süresinin yarısı)
```

- **Kaçırma Uzmanlığı (0-100):** başarılı kaçırma +1 (ağır hükümlü +3),
  her 10 puan → +%2 başarı. Yaptıkça ustalaşma; uzmanlar sunucuda
  "kurtarıcı" statüsü kazanır, hizmeti paralı satabilir (oyuncu anlaşması).
- Kaçıran, kaçırılanın bağlı olduğu NPC ailesinden +5 itibar alır.

---

## 17. Yardım Çağrıları (Assist) & Baba Suikasti

### 17.1 Çağrı Tipleri (Socket.io anlık bildirim)

| Çağrı | Mekanik |
|---|---|
| **Ekip suçu daveti** | "1 kişi eksik" çağrısı → klan/arkadaş listesine, tek tıkla katılım |
| **Saldırı altındayım** | Misilleme penceresi açılınca klandaşlar bildirim alır → 30 dk içinde onlar da saldırgana misilleme hakkı kazanır |
| **Kaçırma çağrısı** | Hapse düşen "beni kaçırın" yayınlar → kaçırma uzmanlarına iş akışı |
| **Bölge savunması** | Savaş fazında yoğun saldırıda savunan klana toplu "cepheye" çağrısı |

- Çağrılar 30 dk'da düşer; spam engeli: oyuncu başına saatte 2 çağrı.

### 17.2 Baba Suikasti (Klan İçi Darbe)

**Şartlar:** ≥30 gün üyelik + Reis/Danışman rütbesi + gizli destek
oylaması (%40+ üye desteği) → tek kişilik kapris değil, komplo organizasyonu.

- **Suikast = özel PvP:** Baba savunmasına +%25 (koruma duvarı);
  komploya katılan her Reis/Danışman suikastçıya +%5.
- **Başarı:** suikastçı Baba olur; eski Baba sürülür + tüm aile
  itibarlarından −100 (damgalı).
- **Başarısızlık:** komplocular atılır + sunucu geneli ilan
  ("hain damgası": 7 gün klanlara katılamaz).
- **Sadakat bağlantısı:** klan ortalama sadakati %50 altındaysa oylama
  eşiği %40 → %30. Kötü yönetilen klan darbeye kırılgan — organik denge.

---

## 18. Sadakat (Loyalty) Sistemi

Her üyenin klana Sadakat puanı (0-100) — klanın iç sağlık göstergesi.

### 18.1 Kaynak / Etki

| Kaynak | Etki |
|---|---|
| Baba görevini tamamlama | +5~15 |
| Klan hazinesine bağış | +1 / 10.000₺ (günlük tavan +10) |
| Bölge savaşına katılım | +10 |
| Klan suçlarına katılım | +2 |
| Görev reddi / 7 gün inaktiflik | −5 |
| Klandaşa saldırı | −30 |

### 18.2 Baba Görevlendirmeleri

Baba/Danışman panelden üyelere hedef atar: "bu hafta 50.000₺ bağış",
"X bölgesinde 20 suç", "şu oyuncuya kontrat". Tamamlayan sadakat +
hazineden ödül payı alır → klan yönetimine "yönetim oyunu" katmanı.

### 18.3 Sadakat Kademeleri

```
0-29    Şüpheli   — düşük suç payı, hassas bilgiye erişemez
30-59   Üye       — standart
60-84   Sadık     — klan suçlarında +%3 başarı, savaşta +%5 kontrol puanı
85-100  Kan Bağı  — ortak işletme gelirinden pay, Reis terfisinde öncelik
```

- Klandan ayrılan oyuncunun sadakati sıfırlanır; yeni klanda 0'dan başlar
  (klan hoplamayı caydırır).

---

## 19. Teknik Notlar (Mimari Kararlar)

- **Stack:** Phaser 3 + React (client) / Node.js + Fastify (API) /
  PostgreSQL + Prisma / Redis (AP regen, cooldown, fiyat sayaçları) /
  Socket.io (gerçek zamanlı bildirimler)
- Suç ve işletme tanımları **config/JSON tabanlı** — kod değişikliği olmadan
  yeni içerik eklenebilir; balans patch'leri veri güncellemesiyle yapılır.
- Tüm para işlemleri (suç ödülü, aklama, pazar) **transaction log** tablosuna
  yazılır — ekonomi telemetrisi ve hile tespiti için temel.

---

## 20. Açık Sorular (Sonraki Tasarım Turları)

- [x] Klan / bölge kontrol sistemi → Bölüm 5
- [x] PvP dövüş formülü → Bölüm 6
- [x] Aile bazlı itibar sistemi → Bölüm 8
- [x] Aksiyon Puanı kalibrasyonu → Bölüm 9
- [x] Haftalık event tasarımı → Bölüm 11
- [x] Onboarding akışı → Bölüm 12
- [x] Çok şehirli dünya & seyahat → Bölüm 13
- [x] Mal ticareti & kaçakçılık → Bölüm 14
- [x] Dönem aktiviteleri kataloğu → Bölüm 15
- [x] Hapisten kaçırma & uzmanlık → Bölüm 16
- [x] Yardım çağrıları & Baba suikasti → Bölüm 17
- [x] Sadakat sistemi → Bölüm 18

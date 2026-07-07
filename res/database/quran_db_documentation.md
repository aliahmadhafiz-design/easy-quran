# Quran Application Database Schema Context Documentation
This markdown file acts as a structural reference map for a localized Quranic database application. Use this documentation file context directly to configure queries, formulate database migrations, or build user interface features.

## Database Summary Profile
- **Engine System Backend:** SQLite3
- **Target Production Tables:** 4
- **Dataset Rows Verified:** 6464 Core Verse Records

---

## Structural Schema Blueprints by Table
### Table Structure Blueprint: `surah`
- **Total Database Rows:** 114 records

#### Column Dictionary Matrix:
| Column ID | Name | Data Type | Not Null Constraints | Default Value | Primary Key? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | **id** | `INTEGER` | No | `None` | 🔑 Primary Key |
| 1 | **surah_number** | `INTEGER` | ✓ Yes | `None` |  |
| 2 | **name_english** | `TEXT` | ✓ Yes | `None` |  |
| 3 | **name_arabic** | `TEXT` | ✓ Yes | `None` |  |
| 4 | **name_meaning** | `TEXT` | No | `None` |  |
| 5 | **revelation_place** | `TEXT` | No | `None` |  |
| 6 | **total_verses** | `INTEGER` | ✓ Yes | `None` |  |

#### Active System Row Preview (Limit 2 Sample Data Entries):
| id | surah_number | name_english | name_arabic | name_meaning | revelation_place | total_verses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | Al-Fatihah | الفاتحة | NULL | NULL | 7 |
| 2 | 2 | Al-Baqarah | البقرة | NULL | NULL | 286 |

---

### Table Structure Blueprint: `para`
- **Total Database Rows:** 30 records

#### Column Dictionary Matrix:
| Column ID | Name | Data Type | Not Null Constraints | Default Value | Primary Key? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | **id** | `INTEGER` | No | `None` | 🔑 Primary Key |
| 1 | **para_number** | `INTEGER` | ✓ Yes | `None` |  |
| 2 | **start_verse_id** | `INTEGER` | No | `None` |  |
| 3 | **end_verse_id** | `INTEGER` | No | `None` |  |
| 4 | **total_verses** | `INTEGER` | ✓ Yes | `None` |  |

#### Active System Row Preview (Limit 2 Sample Data Entries):
| id | para_number | start_verse_id | end_verse_id | total_verses |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | 1 | 152 | 148 |
| 2 | 2 | 153 | 263 | 111 |

---

### Table Structure Blueprint: `ruku`
- **Total Database Rows:** 558 records

#### Column Dictionary Matrix:
| Column ID | Name | Data Type | Not Null Constraints | Default Value | Primary Key? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | **id** | `INTEGER` | No | `None` | 🔑 Primary Key |
| 1 | **ruku_number** | `INTEGER` | ✓ Yes | `None` |  |
| 2 | **surah_id** | `INTEGER` | No | `None` |  |
| 3 | **para_id** | `INTEGER` | No | `None` |  |
| 4 | **start_verse_id** | `INTEGER` | No | `None` |  |
| 5 | **end_verse_id** | `INTEGER` | No | `None` |  |

#### Active Relational Foreign Keys:
- 🔗 Column `ruku.para_id` points references ➔ `para.id`
- 🔗 Column `ruku.surah_id` points references ➔ `surah.id`

#### Active System Row Preview (Limit 2 Sample Data Entries):
| id | ruku_number | surah_id | para_id | start_verse_id | end_verse_id |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | 1 | 1 | 1 | 9 |
| 2 | 2 | 2 | 1 | 10 | 18 |

---

### Table Structure Blueprint: `verse`
- **Total Database Rows:** 6464 records

#### Column Dictionary Matrix:
| Column ID | Name | Data Type | Not Null Constraints | Default Value | Primary Key? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | **id** | `INTEGER` | No | `None` | 🔑 Primary Key |
| 1 | **verse_key** | `TEXT` | ✓ Yes | `None` |  |
| 2 | **verse_number** | `INTEGER` | ✓ Yes | `None` |  |
| 3 | **verse_text** | `TEXT` | ✓ Yes | `None` |  |
| 4 | **verse_text_clean** | `TEXT` | ✓ Yes | `None` |  |
| 5 | **surah_id** | `INTEGER` | No | `None` |  |
| 6 | **para_id** | `INTEGER` | No | `None` |  |
| 7 | **ruku_id** | `INTEGER` | No | `None` |  |
| 8 | **start_line** | `INTEGER` | No | `None` |  |
| 9 | **end_line** | `INTEGER` | No | `None` |  |
| 10 | **start_page** | `INTEGER` | No | `None` |  |
| 11 | **end_page** | `INTEGER` | No | `None` |  |
| 12 | **hadar_audio_url** | `TEXT` | No | `None` |  |
| 13 | **tarteel_audio_url** | `TEXT` | No | `None` |  |

#### Active Relational Foreign Keys:
- 🔗 Column `verse.ruku_id` points references ➔ `ruku.id`
- 🔗 Column `verse.para_id` points references ➔ `para.id`
- 🔗 Column `verse.surah_id` points references ➔ `surah.id`

#### Optimized Search Query Indexes:
- ⚡ Speed Index Hook Enabled: `idx_verse_clean_text`
- ⚡ Speed Index Hook Enabled: `idx_verse_para`
- ⚡ Speed Index Hook Enabled: `idx_verse_surah`

#### Active System Row Preview (Limit 2 Sample Data Entries):
| id | verse_key | verse_number | verse_text | verse_text_clean | surah_id | para_id | ruku_id | start_line | end_line | start_page | end_page | hadar_audio_url | tarteel_audio_url |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 1:0 | 0 | سورة الفاتحة | سورة الفاتحة | 1 | 1 | 1 | 1 | 1 | 1 | 1 | NULL | NULL |
| 2 | 1:00 | 0 | بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْم... | بسم اللٰه الرحمٰن الرحیم ۟ | 1 | 1 | 1 | 2 | 2 | 1 | 1 | https://audio-cdn.tarteel.ai/quran/ab... | https://audio-cdn.tarteel.ai/quran/ab... |

---

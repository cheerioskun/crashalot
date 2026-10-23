# Data

Downloaded October 23, 2026. Raw source files stay local in `data/raw/`, which is ignored by Git. [sources.json](sources.json) records download URLs, byte sizes, hashes, and the Hugging Face revision.

| Source | Local copy | Scope / license / use |
| --- | --- | --- |
| [PlaneCrashData, MauroPello](https://huggingface.co/datasets/MauroPello/planecrashdata) | `raw/planecrashdata.parquet`, dataset card and metadata | 27,598 records, 1918–2026; CC BY 4.0. Primary observed chart source. Exact revision in manifest. |
| [Aircraft production, alvaroibrain](https://www.kaggle.com/datasets/alvaroibrain/aircraft-production-data) | `raw/aircraft-production.zip`, extracted `raw/aircraft-production/aircraft_data.csv` | 1,266 model rows; Kaggle metadata lists CC0. Production counts are not flights or utilization. Not joined to the prototypes. |
| [Historical ACARS index](https://web.archive.org/web/20180425185655/http://www.acarsd.org/world_ACARS_reports.html) | `raw/acars-world-reports.html`, `raw/acars-report-20060101.txt` | Archived index plus one complete linked daily report (January 1, 2006), not the entire multi-year corpus. The report header lists 13,777 messages. Messages do not establish unique flight counts or representative coverage. Reuse license not established; not redistributed in the website. |
| [US Accidents, sobhanmoosavi](https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents) | `raw/us-accidents.zip` (~653 MiB), extracted `raw/us-accidents/US_Accidents_March23.csv` (~3.06 GB) | 7,728,394 records, 2016–2023. Kaggle metadata lists CC BY-NC-SA 4.0. No fatalities column; severity is not a death count. Not redistributed or used in the aviation charts. |
| [World Bank / ICAO departures](https://data.worldbank.org/indicator/IS.AIR.DPRT) | `raw/world-bank-departures.json`, `raw/world-bank-indicator.json` | WLD registered-carrier departures, nonmissing through 2023, CC BY 4.0. Shown as contextual indexed trend; not a validated denominator for the accident source. |

The Kaggle archives were extracted locally. The restore script downloads the original archives without extracting them. Do not commit the multi-gigabyte road file or raw archives.

## Restore and prepare

```sh
uv sync
uv run python scripts/fetch_data.py
uv run python scripts/prepare_data.py
```

`fetch_data.py` streams downloads and checks each downloaded file against the manifest hash. Unversioned sources can change; a mismatch stops for review. The ACARS restore covers the archived index and the selected daily report only.

`prepare_data.py` generates `public/data/sketch-data.json` and records the local source hashes. It checks unique IDs, cohort total conservation, cause and phase reconciliation, and valid onboard fatality numerators. The small derived JSON is tracked so the static website builds without downloading raw data or installing Python in Cloudflare.

Derived aviation aggregates and limited narrative excerpts are attributed to MauroPello's PlaneCrashData (CC BY 4.0); departures are attributed to World Bank / ICAO (CC BY 4.0). Transformations: period/cohort filtering, aggregation, occupancy consistency checks, broad phase mapping, and explicit keyword matching. See [the sketch analysis](../docs/sketch-analysis.md) and the gallery's definitions for limitations. The source datasets' rights are not relicensed by this repository.

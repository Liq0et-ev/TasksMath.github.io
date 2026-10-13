# Daļu piedzīvojums 🍕

Gamificēta matemātikas spēle (Roblox stilā) par daļu un jauktu skaitļu reizināšanu un dalīšanu ar veselu skaitli.
Uzdevumu tipi ņemti no skolnieces uzdevumi.lv darba (13.10.2026) — katrs no 14 uzdevumu tipiem ir viens līmenis.

**Spēlēt:** https://liq0et-ev.github.io/TasksMath.github.io/

## Kā tas strādā
- 3 zonas, 14 līmeņi; nākamais līmenis **atslēdzas**, kad iepriekšējais ir pabeigts (5 pareizas atbildes, 3 ❤️).
- Uzdevumi tiek **ģenerēti nejauši**, tāpēc var trenēties bezgalīgi.
- Pirmā kļūda → mājiens (piem. „reizinot daļu, jāreizina skaitītājs”), otrā → pilns risinājums pa soļiem un zaudēta sirds.
- Katrs līmenis dod zvaigznes, monētas un jaunu varoni.
- **Skolotāja panelis** (poga lapas apakšā, kods `skolotajs`): precizitāte pa līmeņiem, biežākie kļūdu veidi, eksports uz JSON, visu līmeņu atvēršana, progresa dzēšana.
  Kods ir tikai aizsardzība pret nejaušu atvēršanu, nevis drošības līdzeklis. Progress tiek glabāts tikai skolēna ierīcē (localStorage).

## Līmeņi
| # | Tēma |
|---|------|
| 1–5 | Daļas dalīšana/reizināšana ar veselu, saīsināšana, rezultāts vesels vai jaukts |
| 6–11 | Jaukta skaitļa reizināšana un dalīšana ar veselu, „n reizes mazāks” |
| 12–14 | Teksta uzdevumi: apsveikumi, soliņi, maizes kukulīši (boss) |

## Izstrāde
Tīrs HTML/CSS/JS, bez būves soļa. Atvērt `index.html` vai `python -m http.server`.

```bash
node tests/engine.test.js   # 21 000 ģenerētu uzdevumu pārbaude
```

## Typer mängu muudatused

### Greeny link:
greeny.cs.tlu.ee/~leitalur/eesrakendused/kodutoo-2

### 1. Visuaalne disain ja kasutajakogemus
*   **Google Fonts integratsioon**: Rakenduses on kasutusel 'Roboto' põhiteksti jaoks, et tagada kaasaegne ja loetav välimus.
*   **Täielik CSS uuendus**: Kõik algsed värvid, suurused ja elementide mõõtmed on asendatud uue cyberpunk-stiilis tumeda teemaga.
*   **Mobiilisõbralikkus (Responsive Design)**: Kasutusele on võetud CSS *media queries*, mis kohandavad mänguala ja tekstisuurusi vastavalt seadme ekraani laiusele.
*   **Täiustatud CSS loogika**: Rakendatud on vähemalt 5 erinevat *pseudo-class*'i (nt `:hover`, `:active`, `:focus`, `:nth-child`, `:first-child`), et muuta liides dünaamilisemaks.

### 2. Tulemuste süsteem ja edetabel
*   **Modaalaken**: Tulemused ja edetabel kuvatakse eraldi modal-aknas, mis avaneb nupule vajutades ja sulgub "x" märgiga või väljaspool akent klikkides.
*   **Struktureeritud andmed**: Tulemused ei ole enam tühikutega eraldatud tekst, vaid paigutatud selgetesse tulpadesse koos pealkirjadega (Koht, Nimi, Aeg, WPM).
*   **Visuaalne tagasiside (Speed Rank)**: Vastavalt trükkimiskiirusele (WPM) kuvatakse tulemuste aknas vastav pilt ja hinnang:
    *   **Tigu**: < 30 WPM.
    *   **Jänes**: 30 - 60 WPM.
    *   **Gepard**: > 60 WPM.

### 3. Audiovisuaalsed efektid
*   **Heliefektid**: Mängule on lisatud neli erinevat heliklippi:
    *   `start.mp3`: Mängu loenduri algus.
    *   `key.mp3`: Iga õige tähe trükkimine.
    *   `end.mp3`: Mängu lõpetamine.
    *   `top.mp3`: Edetabeli esikolmikusse jõudmine.

### 4. Uued lisafunktsioonid (Features)
*   **Elude süsteem**: Mängijal on 5 elu. Iga vale tähetrükk vähendab elude arvu, lisades mängule strateegilise mõõtme.
*   **Progressiriba**: Ekraani ülaosas on dünaamiline riba, mis täitub reaalajas vastavalt sellele, kui suur osa tekstist on juba trükitud.
*   **Reaalajas WPM-i näidik**: Trükkimise ajal arvutatakse ja kuvatakse kasutajale jooksvalt tema keskmist kiirust (sõna minutis).

# kodutoo-2
Täiusta tunnis loodud typer'i rakendust.

Tähtaeg: 05.05.2026 23:59

# Kõik nõuded täidetud, siis 30 punkti.

1. Kasuta veebilehel mõnda Google fonti: https://fonts.google.com/
2. Tulemused peavad tulema välja nupule vajutades ja minema peitu x vajutades. Võimalus kasutada tavalist modalit või sidebari. https://www.w3schools.com/howto/howto_css_modals.asp
3. Kuva tulemused paremini välja, kui praegu. Praegu lihtsalt tühikutega eraldatud tulemused, aga paiguta need eraldi elementidesse ja kujunda selgemalt. Lisa ka pealkirjad igale osale, et saaks aru, mis osaga on tegemist (nimi, kiirus jne).
4. Kuva kasutajel vastavalt trükkimiskiirusele pilti tulemuste osas. Näiteks võib võtta antud lingilt vahemikud ja vastavalt sellele kuvada erinevat pilti: https://www.typingpal.com/en/blog/good-typing-speed
5. Teha rakendus paremini kasutatavaks ka mobiilivaatest kasutades media query't: https://www.w3schools.com/css/css_rwd_mediaqueries.asp
6. Muuda lehe CSS-i vastavalt oma soovidele muutes ära kõik praegu rakenduses kasutusel olevad värvid, teksti suurused ja elementide mõõtmed. Ideid leiad siit: https://www.w3schools.com/css/default.asp
7. Leia moodus, kuidas kasutada CSS-is vähemalt 5-t erinevat pseudo class-i: https://www.w3schools.com/css/css_pseudo_classes.asp
8. Rakenda 4 erinevat heliklippi mängu jooksul - alguse jaoks, mängu jooksul, lõpus ja kui tulemus jõuab edetabelisse.
10. Lisa omaltpoolt veel 3 feature, mida hetkel rakenduses pole.

### GitHub'i töövoog kodutöö esitamiseks

1. *Fork*'i ülesande/projekti repositoorium (leiab [https://github.com/eesrakendused-2026/](https://github.com/eesrakendused-2026/)).
1. *Clone*'i see repositoorium enda arvutisse/serverisse ja määra repositooriumi URL kuhu edaspidi muudatusi salvestad.
  ```
  git clone https://YOURUSERNAME@github.com/YOURUSERNAME/REPOSITORY.git

  nt esimese iseseisva töö puhul:
  git clone https://jukujuurikas@github.com/jukujuurikas/1kodutoo.git
  ```
1. Lisa vajdusel oma nimi ja email repositooriumi omanikuks ([Setting your username](https://help.github.com/articles/setting-your-username-in-git/)). Vajadusel hangi endale privaatne e-post @users.noreply.github.com lõpuga (https://github.com/settings/emails)
  ```
  git config --global user.name "Tauri Kirsipuu"
  git config --global user.email taurikirsipuu@users.noreply.github.com
  ```
1. Muuda faile ülesande lahendamiseks ja *Commit*'i iga olulisem muudatus, kasutades kahte käsku.
  ```
  git add .
  ```
  ```
  git commit -m "Added this functionality to the app"
  ```
1. Veendu, et kogu kood on *Commit*'itud.
  ```
  git status
  ```
1. *Push/sync*'i muudatused GitHub'i.
  ```
  git push origin
  ```
1. [Ava *pull request*](https://help.github.com/articles/creating-a-pull-request) ülesande originaalses repositooriumis. Järgi üleasende esitamise tähtaega
1. Muudatusi ja täiendusi võib *push*'ida repositooriumisse, kuni ette antud kuupäevani.

Tagasisidet saab otse *pull request*'i millele ootan Sinupoolseid kommentaare/mõtteid/küsimusi. Võid julgselt avada *pull request*'i kohe kui hakkad kodutöö kallal tegelama ja siis kui hätta jääd võid esitada sinna küsimuse. Maini kommentaaris minu kasutajat `@taurikirsipuu` siis jõuan sellele kiiremini vastata.

### Nõuded

* Peab järgma "head programmeerimise stiili"
    * Muutujate nimed peavad kirjeldama muutujat ning peavad olema inglise keeles
    * Funktsiooni nimi peab olema "lühike"
    * Optimeeri koodi lugemiseks (real ~80 tähemärki)
    * Projektide jaoks tuleb kasutada objektorienteeritud lähenemist
    * Laenatud koodile tuleb viidata
* Boonuspunktid:
    * Loomingulisus (NB! nõuded peavad olema täidetud)



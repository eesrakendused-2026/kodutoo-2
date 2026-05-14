# Typer Game

Interaktiivne kiirtrükkimise mäng, mis on loodud objektorienteeritud programmeerimise (OOP) printsiipe järgides. Mäng mõõdab kasutaja trükkimiskiirust, täpsust ning pakub dünaamilist tagasisidet läbi visuaalsete ja heliliste efektide.

## Funktsionaalsused

* **OOP Arhitektuur**: Kogu mängu loogika on koondatud `Typer` klassi.
* **Progressiriba**: Dünaamiline ülevaade mängu käigust.
* **Dark Mode**: Silmasõbralik tume režiim, mis kohandub kogu kasutajaliidesega.
* **Audio-visuaalne tagasiside**:
    * Neli erinevat heliklippi (`gamestart`, `background`, `celebration`, `success`).
    * Vigade korral "Shake" efekt ja punane indikaator.
* **Firebase integratsioon**: Tulemuste salvestamine ja TOP 20 edetabeli kuvamine.
* **Mobiilisõbralik**: Täielikult kooditud kergelt kohanduvaks (Responsive Design).

## Kasutamine

1.  Logi sisse Google kontoga.
2.  Vali soovitud raskusaste (sõnade arv).
3.  Trüki ekraanil kuvatavaid sõnu nii kiiresti kui saad.
4.  Kasuta ülanurgas olevaid nuppe teema vahetamiseks või muusika vaigistamiseks.

## Arendusprotsess ja tagasiside

Projekt on loodud õppeülesande raames. Arendusprotsessis on jälgitud koodi loetavust (max 80 tähemärki real) ja muutujate korrektset ingliskeelset nimetamist.

## Viited

* **Fondid**: [Google Fonts - Montserrat](https://fonts.google.com/specimen/Montserrat)
* **Ikoonid ja inspiratsioon**: Mängumehaanika ja CSS-lahendused on kohandatud eesrakenduste arendamise kursuse materjalide põhjal.
* **Heliefektid**: Kasutatud tasuta kättesaadavaid mänguheli ressursse.

## Laenatud kood
1.  **Arhitektuur**: Koostöös AI-ga sai paika pandud mängu klassi struktuur, 
    et vältida globaalseid muutujaid ja järgida head OOP stiili.
2.  **Visuaalne loogika**: AI aitas välja töötada dünaamilise CSS-i süsteemi, 
    kus Dark Mode ja modaalaknad töötavad sujuvalt koos ilma kontrastiveateta.
3.  **Modaalakna tabeli loogika**: AI aitas mõista kuidas luua modaalaknasse
    tabel kasutades HTMLi elemente JSi sees.

## Tehniline pinu

* **HTML5** & **CSS3** (Custom Properties, Flexbox, Animations)
* **JavaScript (ES6)** - Klassipõhine lähenemine
* **Firebase** - Autentimine ja Realtime Database
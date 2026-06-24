const BASE = 'http://localhost:4000/api';
async function api(path, method = 'GET', body = null, token = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

// ─── PROCEDURES ───────────────────────────────────────────────────────────────
// Key = exact recipe name as in DB. Only empty notes will be filled.
const PROCEDURES = {

  'Almond Raspberry Vegan': `1. Backofen auf 175 °C Ober-/Unterhitze vorheizen. Eine Springform (22 cm) einfetten und mit Backpapier auslegen.

2. Gemahlene Mandeln, Mehl, Backpulver und Weizenstärke in einer Schüssel vermengen und beiseitelegen.

3. Sonnenblumenöl und Zucker mit dem Handmixer 2 Minuten cremig rühren. Vanilleextrakt unterrühren.

4. Die trockenen Zutaten in zwei Portionen unter die Ölmasse heben, bis ein gleichmäßiger Teig entsteht.

5. Teig in die vorbereitete Form füllen. Himbeermark in kleinen Tupfern auf dem Teig verteilen und mit einer Gabel leicht einarbeiten (Marmor-Effekt).

6. Im vorgeheizten Ofen 30–35 Minuten goldbraun backen. Stäbchenprobe: trocken = fertig.

7. Kuchen in der Form 10 Minuten abkühlen lassen, dann auf ein Gitter stürzen und vollständig auskühlen.

8. Schlagcreme steif aufschlagen. Kuchen nach Wunsch mit Schlagcreme und frischen Himbeeren dekorieren.`,

  'Banana Bread': `1. Backofen auf 175 °C Ober-/Unterhitze vorheizen. Eine Kastenform (ca. 25 cm) einfetten und mit Backpapier auslegen.

2. Reife Bananen in einer großen Schüssel mit einer Gabel gründlich zerdrücken, bis eine cremige Masse entsteht. Je reifer die Bananen, desto süßer wird das Brot.

3. Weiche Margarine, weißen Zucker und braunen Zucker zur Bananenmasse geben und mit dem Handmixer ca. 3 Minuten cremig aufschlagen.

4. Eier einzeln unterrühren. Vanilleextrakt hinzufügen und alles gut vermengen.

5. Mehl, Backpulver und Natron in einer separaten Schüssel sieben. Die trockenen Zutaten in zwei Portionen unter die feuchte Masse heben – nur bis alles gerade verbunden ist. Nicht zu lange rühren, sonst wird das Brot zäh.

6. Teig in die vorbereitete Form füllen und die Oberfläche glattstreichen. Optional: eine halbe Banane längs auf den Teig legen.

7. Im vorgeheizten Ofen 55–60 Minuten backen. Nach 30 Minuten prüfen – bei zu dunkler Oberfläche mit Alufolie abdecken. Stäbchenprobe: Wenn kein Teig klebt, ist das Brot fertig.

8. Brot 15 Minuten in der Form abkühlen lassen, dann auf ein Kuchengitter stürzen und vollständig auskühlen lassen, bevor es angeschnitten wird.`,

  'Bananenbrot': `1. Backofen auf 175 °C vorheizen. Kastenform einfetten und mehlen.

2. Bananenpüree, weiche Margarine, weißen Zucker und braunen Zucker in einer Schüssel glatt rühren.

3. Mehl, Backpulver und Natron sieben und in zwei Portionen unter die Bananenmasse heben – zügig und ohne Übermischen.

4. Teig in die Form füllen, Oberfläche glattstreichen.

5. Bei 175 °C ca. 55 Minuten backen. Stäbchenprobe: sauber = fertig. 15 Minuten in der Form auskühlen, dann stürzen.`,

  'Baked Cheesecake': `1. Backofen auf 160 °C Ober-/Unterhitze vorheizen. Eine Springform (26 cm) einfetten. Den Boden mit Alufolie doppelt einwickeln – das verhindert Wassereintritt beim Wasserbad.

2. Für den Boden: Butterkekse fein zerbröseln, mit geschmolzener Butter mischen und gleichmäßig auf den Boden der Form drücken. 10 Minuten im Kühlschrank festigen lassen.

3. Frischkäse in einer großen Schüssel mit dem Mixer auf niedrigster Stufe glatt rühren. Zucker hinzufügen und einarbeiten – nicht zu viel Luft einschlagen, sonst reißt die Oberfläche.

4. Eier einzeln bei niedriger Geschwindigkeit unterrühren. Jedes Ei vollständig einarbeiten, bevor das nächste hinzukommt.

5. Sahne, Vanillepuddingpulver und eine Prise Salz unterrühren, bis eine glatte homogene Masse entsteht.

6. Füllung auf den Keksboden gießen und glattstreichen. Springform in eine tiefe Backform stellen. Kochendes Wasser bis zur Hälfte der Springform einfüllen (Wasserbad).

7. Im vorgeheizten Ofen 55–65 Minuten backen. Der Rand soll fest sein, die Mitte darf noch leicht wackeln – sie festigt sich beim Abkühlen.

8. Ofen ausschalten, Tür einen Spalt öffnen und den Kuchen 1 Stunde im abkühlenden Ofen stehen lassen. Dieser Schritt verhindert Risse.

9. Aus dem Wasserbad nehmen, vollständig auskühlen lassen. Mindestens 4 Stunden – besser über Nacht – im Kühlschrank kühlen, bevor der Rand gelöst wird.`,

  'Blaubeere Zitrone': `1. Für den Teig: Eier, Zucker und Vanillepuddingpulver aufschlagen. Öl und Joghurt unterrühren. Mehl und Backpulver sieben und unterheben.

2. Teig in eine gefettete Springform (26 cm) füllen. Bei 175 °C ca. 30 Minuten vorbacken. Auskühlen lassen.

3. Für die Creme: Milch erhitzen, Puddingpulver einrühren und unter Rühren aufkochen, bis die Masse eindickt. Mit Zitrone abschmecken. Abkühlen lassen, dabei Folie direkt auf die Oberfläche legen.

4. Sahne steif aufschlagen und unter die abgekühlte Puddingcreme heben.

5. Creme gleichmäßig auf dem Boden verteilen. TK-Beeren (leicht aufgetaut und abgetropft) auf der Creme verteilen.

6. Topglanz nach Packungsanweisung zubereiten und über die Beeren gießen. Mindestens 2 Stunden im Kühlschrank fest werden lassen.`,

  'Blaubeere-Zitrone Torte 26cm': `1. Biskuitboden nach Grundrezept backen (26 cm) und vollständig auskühlen lassen. Einmal waagerecht halbieren.

2. Kalte Creme mit Milch und Puderzucker nach Packungsanweisung zubereiten. Kühl stellen bis zur gewünschten Konsistenz.

3. Zitronenpaste und Puddingpulver Vanille einrühren. Sahne steif aufschlagen und unterheben.

4. Unteren Boden auf eine Tortenplatte legen. Hälfte der Creme aufstreichen. Oberen Boden aufsetzen. Restliche Creme auf Oberfläche und Rand auftragen.

5. TK-Heidelbeeren (aufgetaut, abgetropft) dekorativ auf der Torte verteilen. Topglanz nach Packungsanweisung zubereiten und über die Beeren gießen.

6. Mindestens 3 Stunden im Kühlschrank kühlen, bevor die Torte angeschnitten wird.`,

  'Cheesecake 26cm': `1. Backofen auf 165 °C vorheizen. Springform (26 cm) einfetten, Boden mit Backpapier auslegen.

2. Frischkäse, Cremepulver und Zucker auf niedrigster Stufe glatt rühren – keine Luft einschlagen.

3. Vollei nach und nach unterrühren. Vanille und Sahne einrühren bis alles glatt und homogen ist.

4. Masse in die Form füllen und glattstreichen. Im Wasserbad (kochendes Wasser bis zur Hälfte der Form) bei 165 °C 60–70 Minuten backen.

5. Ofen abschalten, Tür einen Spalt öffnen. Kuchen 1 Stunde langsam abkühlen. Dann aus dem Wasserbad nehmen und über Nacht im Kühlschrank kühlen.

6. Butter für den Boden schmelzen, mit Keksbröseln mischen und nach dem Abkühlen des Kuchens als Boden-Finish verwenden, oder vor dem Backen als Keksboden einarbeiten.`,

  'Chocolate Fudge Cake': `1. Backofen auf 175 °C vorheizen. Zwei Backformen (20 cm) einfetten und mehlen.

2. Butter und Zucker cremig aufschlagen. Eier einzeln unterrühren.

3. Kakaopulver, Mehl und Backpulver sieben. Abwechselnd mit der Milch unter die Buttermasse rühren.

4. Teig gleichmäßig auf beide Formen aufteilen. Bei 175 °C 30–35 Minuten backen. Stäbchenprobe: trocken = fertig. Vollständig auskühlen lassen.

5. Für die Fudge-Glasur: Kuvertüre im Wasserbad schmelzen und mit Sahne und Butter zu einer glatten Ganache rühren. Auf Raumtemperatur abkühlen bis sie streichfähig ist.

6. Ersten Boden auf eine Tortenplatte legen, mit einem Drittel der Glasur bestreichen. Zweiten Boden aufsetzen, restliche Glasur auf Oberfläche und Rand auftragen und glattstreichen.

7. Mindestens 1 Stunde kühl stellen, damit die Glasur fest wird.`,

  'Classic Cheesecake': `1. Backofen auf 160 °C vorheizen. Springform (24 cm) einfetten. Keksboden: Kekse zerbröseln, mit geschmolzener Butter mischen, in die Form drücken und 10 Minuten kühlen.

2. Frischkäse (Cream Cheese) auf niedrigster Stufe glatt rühren. Zucker und Puderzucker einrühren.

3. Eier einzeln unterrühren. Milch und Vanilleextrakt hinzufügen. Masse glatt und luftarm rühren.

4. Füllung auf dem Keksboden verteilen. Im Wasserbad 55–65 Minuten bei 160 °C backen. Rand fest, Mitte leicht wackelnd.

5. Im abgeschalteten Ofen mit geöffneter Tür 1 Stunde nachziehen lassen. Dann über Nacht im Kühlschrank kühlen.`,

  'Classic Vanilla Cake': `1. Backofen auf 175 °C vorheizen. Zwei Backformen (20 cm) oder eine Springform (24 cm) einfetten und mehlen.

2. Weiche Butter, Zucker und Vanilleextrakt ca. 5 Minuten hell und cremig aufschlagen.

3. Eier einzeln unterrühren – jedes vollständig einarbeiten, bevor das nächste hinzukommt.

4. Mehl und Backpulver sieben. Abwechselnd mit der Milch unter die Buttermasse heben – mit Mehl beginnen und enden.

5. Teig in die vorbereiteten Formen füllen und glattstreichen. Bei 175 °C 30–35 Minuten backen. Stäbchenprobe: trocken = fertig. Vollständig auskühlen lassen.

6. Buttercreme oder Vanillecreme nach Wunsch zwischen die Schichten und auf der Oberfläche verteilen.`,

  'Cupcakes': `1. Backofen auf 175 °C vorheizen. Muffinblech mit Papierförmchen auslegen (12 Stück).

2. Öl, Joghurt, Zucker und Eier in einer Schüssel glatt rühren. Himbeermark unterrühren.

3. Mehl und Backpulver sieben und unter die feuchte Masse heben – nicht übermischen.

4. Förmchen zu zwei Dritteln befüllen. Bei 175 °C 18–20 Minuten backen. Stäbchenprobe: trocken = fertig. Vollständig auskühlen lassen.

5. Sahne und Mascarpone steif aufschlagen, Vanille und etwas Zucker einrühren. In einen Spritzbeutel mit Sterntülle füllen.

6. Topping auf jeden abgekühlten Cupcake aufspritzen. Mit Beeren und Beeren-Schale dekorieren. Bis zum Servieren kühl stellen.`,

  'Eis Cups': `1. Haferflocken in einer trockenen Pfanne bei mittlerer Hitze goldbraun rösten. Abkühlen lassen.

2. Mascarpone, Joghurt, Honig und Vanille in einer Schüssel glatt rühren.

3. Erdnussbutter einrühren, bis eine homogene Creme entsteht.

4. TK-Beeren leicht antauen lassen und mit einem Schuss Honig marinieren.

5. In Dessertgläser oder -becher schichten: zuerst geröstete Haferflocken, dann Mascarpone-Creme, dann Beeren. Schichten wiederholen.

6. Mindestens 1 Stunde einfrieren oder bis zur gewünschten Konsistenz. Vor dem Servieren 5 Minuten antauen lassen.`,

  'Hafer Cranberry Cookies': `1. Backofen auf 170 °C vorheizen. Zwei Backbleche mit Backpapier auslegen.

2. Weiche Margarine, Zucker und braunen Zucker ca. 3 Minuten cremig aufschlagen. Hafermilch und Vanilleextrakt unterrühren.

3. Mehl, Natron und eine Prise Salz sieben und unter die Masse rühren. Haferflocken, Cranberries und gehackte weiße Schokolade unterrühren.

4. Mit einem Eisportionierer oder Esslöffel Häufchen (ca. 40 g) mit genügend Abstand auf die Bleche setzen. Leicht flachdrücken.

5. Bei 170 °C 12–14 Minuten backen, bis die Ränder goldbraun sind – die Mitte darf noch etwas weich wirken, sie festigt sich beim Abkühlen.

6. Cookies 5 Minuten auf dem Blech abkühlen lassen, dann auf ein Gitter transferieren.`,

  'Himbeer Pistazien': `1. Backofen auf 175 °C vorheizen. Springform (22 cm) einfetten.

2. Eier, Zucker und Joghurt mit dem Mixer aufschlagen. Öl einrühren. Mehl und Backpulver unterheben. Teig in die Form füllen, 28–30 Minuten backen. Auskühlen lassen.

3. Gelatine in kaltem Wasser einweichen (5 Minuten). Himbeeren und Erdbeerpüree erwärmen, eingeweichte Gelatine darin auflösen. Abkühlen lassen.

4. Sahne steif aufschlagen. Pistazien grob hacken. Kuvertüre im Wasserbad schmelzen.

5. Boden auf eine Tortenplatte legen. Hälfte der Sahne auf dem Boden verteilen. Frucht-Gelatine-Mix kalt aufgießen, kurz anziehen lassen.

6. Restliche Sahne als Deckel auftragen. Mit geschmolzener Kuvertüre und Pistazien dekorieren. Mindestens 3 Stunden kühl stellen.`,

  'Joghurt Törtchen': `1. Tarteletteformen (8–10 Stück) einfetten. Für den Mürbteigboden: Butter, Mehl und Zucker zu einem glatten Teig verkneten. In die Formen drücken und 15 Minuten bei 180 °C vorbacken. Auskühlen.

2. Gelatine in kaltem Wasser einweichen (5 Minuten). Joghurt, Zucker und Limettensaft glatt rühren. Fondant im Wasserbad schmelzen.

3. Eingeweichte Gelatine in etwas erwärmtem Joghurt auflösen, dann unter die Joghurtcreme rühren.

4. Sahne steif aufschlagen und unterheben.

5. Creme in die vorgebackenen Böden füllen und glattstreichen. Blaubeeren auf der Creme verteilen.

6. Topglanz nach Packungsanweisung zubereiten und über die Beeren gießen. Mindestens 2 Stunden kühl stellen.`,

  'Karotten Kuchen': `1. Backofen auf 175 °C Ober-/Unterhitze vorheizen. Springform (26 cm) einfetten und mehlen.

2. Möhren schälen und fein reiben. Haselnüsse grob mahlen. Beides beiseitelegen.

3. Eier und Zucker ca. 5 Minuten aufschlagen, bis die Masse hell und cremig ist. Sonnenblumenöl langsam einrühren.

4. Mehl, Stärke, Backpulver und Zimt sieben und mit den Möhren und Haselnüssen unter die Eimasse heben – kurz und zügig.

5. Teig in die Form geben, glattstreichen. Im Ofen 40–45 Minuten backen. Stäbchenprobe. Auskühlen.

6. Frischkäse-Frosting: Frischkäse, Puderzucker und Zitronensaft glatt rühren.

7. Kuchen halbieren. Frosting zwischen und auf den Schichten verteilen. Mit Marzipan-Karotten dekorieren. 1 Stunde im Kühlschrank festigen.`,

  'Karottenkuchen': `1. Backofen auf 175 °C vorheizen. Springform (24 cm) einfetten.

2. Karotten schälen und fein reiben. Haselnussgrieß bereitstellen.

3. Öl, Zucker und Eier in einer Schüssel cremig rühren. Vanille, Zimt und Pflanzenmilch einrühren.

4. Mehl, Backpulver, Mais- und Weizenmehl sieben und unterheben. Karotten und Haselnussgrieß einrühren.

5. In die Form füllen, 40–45 Minuten bei 175 °C backen. Auskühlen lassen.

6. Frischkäse-Glasur: Frischkäse mit Puderzucker und einem Spritzer Zitronensaft glattrühren. Auf den abgekühlten Kuchen streichen.`,

  'Kastenkuchen Zitrone': `1. Backofen auf 175 °C vorheizen. Kastenform (25 cm) einfetten und mehlen.

2. Eier, Zucker und Zitronenpaste mit dem Mixer 4 Minuten aufschlagen, bis die Masse hell und cremig ist.

3. Joghurt und Öl einrühren.

4. Mehl und Backpulver sieben und unterheben – zügig, nicht übermischen.

5. Teig in die Form füllen. Bei 175 °C 45–50 Minuten backen. Stäbchenprobe: trocken = fertig.

6. 10 Minuten in der Form abkühlen, dann stürzen und auf einem Gitter vollständig auskühlen lassen. Optional mit Zuckerglasur (Puderzucker + Zitronensaft) übergießen.`,

  'Kokos Rafaello Vegan MF': `1. Cashews und Mandeln 2 Stunden in Wasser einweichen, dann abgießen und spülen.

2. Datteln entkernen. Haferflocken in einer Küchenmaschine zu feinem Mehl mahlen.

3. Eingeweichte Nüsse, Datteln, Hafermehl, Kokosraspeln, Kokosöl, Zucker und Kokosmilch in einem Hochleistungsmixer glatt verarbeiten bis eine formbare Masse entsteht. Bei Bedarf etwas mehr Kokosmilch hinzufügen.

4. Mangopüree nach und nach einarbeiten bis die gewünschte Süße und Konsistenz erreicht ist.

5. Masse mindestens 1 Stunde im Kühlschrank fest werden lassen.

6. Mit angefeuchteten Händen kleine Kugeln (ca. 25 g) formen. In Kokosraspeln wälzen und auf einem Tablett platzieren.

7. Bis zum Servieren im Kühlschrank aufbewahren. Mindestens 30 Minuten vor dem Servieren kühlen.`,

  'Kokos Torte (Vegan)': `1. Backofen auf 175 °C vorheizen. Springform (24 cm) einfetten.

2. Kokosmilch, Öl, Zucker und Wasser glatt verrühren. Vanille hinzufügen.

3. Mehl, Backpulver, Puddingpulver und Kokosraspeln vermengen und unter die flüssige Masse heben.

4. Teig in die Form füllen, 30–35 Minuten bei 175 °C backen. Stäbchenprobe: trocken = fertig. Vollständig auskühlen lassen.

5. Vegane Schlagcreme steif aufschlagen. Torte einmal waagerecht schneiden. Hälfte der Creme auf den unteren Boden streichen. Oberen Boden aufsetzen.

6. Restliche Creme auf Oberfläche und Rand auftragen und glattstreichen. Mit Kokosraspeln bestreuen. Mindestens 2 Stunden kühlen.`,

  'Kulfi Eis': `1. Sahne, Kondensmilch und Rosenwasser in einem Topf bei mittlerer Hitze unter Rühren erhitzen – nicht aufkochen.

2. Mangopüree einrühren. Vanille und gehackte Pistazien hinzufügen.

3. Masse vollständig abkühlen lassen, dabei gelegentlich umrühren um eine Hautbildung zu verhindern.

4. In Kulfi-Förmchen oder kleine Becher füllen. Holzstäbchen einsetzen.

5. Mindestens 6 Stunden – besser über Nacht – einfrieren.

6. Zum Servieren kurz unter warmem Wasser abspülen und aus der Form lösen.`,

  'Lemon Raspberry Tart': `1. Tortellette-Boden in eine Tarteform (22 cm) legen und am Rand andrücken. Bei 180 °C 12 Minuten vorbacken. Auskühlen lassen.

2. Frischkäse, weiße Schokolade (geschmolzen), Sahne und Vanille glatt rühren. Zitronenpüree einrühren. Abschmecken.

3. Sahne separat steif aufschlagen und locker unter die Frischkäsemasse heben.

4. Creme in den vorgebackenen Boden füllen und glattstreichen. Mindestens 2 Stunden im Kühlschrank fest werden lassen.

5. Frische Himbeeren dekorativ auf der Oberfläche verteilen. Optional mit Puderzucker bestäuben.`,

  'Lime Mini Cheesecake': `1. Backofen auf 160 °C vorheizen. Muffinblech mit Papierförmchen auslegen (12 Stück).

2. Keksboden: Kekse fein zerbröseln, mit geschmolzener Butter mischen und je 1 EL in die Förmchen drücken. Kühlen.

3. Frischkäse glatt rühren. Zucker einrühren. Eier einzeln unterrühren. Sahne, Vanillepuddingpulver und Limettensaft einrühren. Mehl unterheben.

4. Masse auf die Keksböden verteilen. Im Ofen 22–25 Minuten backen bis die Ränder fest sind. Im abgeschalteten Ofen mit offener Tür 30 Minuten abkühlen.

5. Mindestens 3 Stunden im Kühlschrank kühlen. Vor dem Servieren mit Limettenscheiben und Frischkäse-Tupfern dekorieren.`,

  'Macaron Törtchen': `1. Backofen auf 145 °C (Umluft) vorheizen. Backblech mit Backpapier auslegen, Kreise (4 cm) aufzeichnen.

2. Gemahlene Mandeln und Puderzucker zusammen fein mahlen und sieben.

3. Eiweiß steif aufschlagen, Zucker in drei Portionen einstreuen und zu glänzendem Eischnee schlagen.

4. Mandelmehlgemisch in 3 Portionen unter den Eischnee heben (Macaronage), bis die Masse vom Spatel wie ein breites Band fällt.

5. In einen Spritzbeutel füllen und Kreise auf das Backpapier aufspritzen. 30 Minuten an der Luft trocknen lassen, bis eine Haut entsteht.

6. Bei 145 °C 13–15 Minuten backen. Vollständig auskühlen lassen und erst dann vom Papier lösen.

7. Frischkäse, Mascarpone, Puderzucker und Erdbeerpüree glatt rühren. Himbeeren unterheben. Füllung in einen Spritzbeutel füllen.

8. Hälfte der Macarons mit Füllung bespritzen, je einen zweiten Macaron aufsetzen. Bis zum Servieren kühl lagern.`,

  'Mandelkuchen MF': `1. Backofen auf 175 °C vorheizen. Springform (22 cm) einfetten.

2. Öl, Zucker, Vanille und Mangopüree glatt rühren. Wasser einrühren.

3. Mehl, Backpulver, Kokosraspeln und gemahlene Mandeln vermengen und unter die flüssige Masse heben.

4. Teig in die Form füllen, 30–35 Minuten backen. Auskühlen lassen.

5. Schlagcreme steif aufschlagen. Puderzucker einrühren. Kuchen einmal halbieren, Creme auf den Boden aufstreichen, Deckel aufsetzen.

6. Restliche Creme auf Oberfläche und Rand verteilen. Mit Kokosraspeln und Mandelblättchen dekorieren.`,

  'Mango Coco Tart': `1. Backofen auf 175 °C vorheizen. Tarteform (24 cm) einfetten.

2. Für den Boden: Margarine, Mehl, Kokosraspeln, Zucker und Backpulver zu einem Teig verkneten. In die Form drücken und 15 Minuten vorbacken. Auskühlen.

3. Kokosmilch, Mangopüree, Agar Agar und Kokossirup in einem Topf aufkochen und 2 Minuten unter Rühren köcheln. Etwas abkühlen lassen.

4. Vegane Schlagcreme steif aufschlagen. Mango-Kokos-Masse unterheben.

5. Creme auf den vorgebackenen Boden gießen und glattstreichen. Mindestens 3 Stunden im Kühlschrank fest werden lassen.

6. Mit Mangoscheiben und Kokosraspeln dekorieren.`,

  'Matcha Rolle': `1. Backofen auf 200 °C vorheizen. Backblech mit Backpapier auslegen (30 × 40 cm).

2. Eigelb und die Hälfte des Zuckers cremig aufschlagen. Mehl, Puddingpulver und Matchapulver sieben und unterheben.

3. Eiweiß mit dem restlichen Zucker zu steifem Schnee schlagen und in drei Portionen unter die Eigelbmasse heben.

4. Teig gleichmäßig auf dem Blech verteilen (ca. 5 mm dick). Bei 200 °C 8–10 Minuten backen – der Teig soll leicht federn aber nicht zu dunkel werden.

5. Teig sofort auf ein mit Zucker bestreutes Backpapier stürzen, das alte Papier abziehen. Von der schmalen Seite her mit dem Papier einrollen und vollständig auskühlen.

6. Frischkäse, Mascarpone, Mangopüree und Puddingpulver glatt rühren.

7. Abgekühlte Rolle vorsichtig auseinanderrollen. Creme gleichmäßig aufstreichen. Wieder straff einrollen, in Frischhaltefolie wickeln und mindestens 2 Stunden kühlen. In Scheiben schneiden.`,

  'Mini Bento Schokopistazie': `1. Backofen auf 175 °C vorheizen. Kleine quadratische Backform oder Muffinblech einfetten.

2. Öl, Zucker und Vollei aufschlagen. Himbeermark einrühren. Mehl, Backpulver und Stärke sieben und unterheben. Teig einfüllen. Bei 175 °C 20–22 Minuten backen. Auskühlen.

3. Gelatine einweichen (5 Minuten). Dunkle Kuvertüre im Wasserbad schmelzen.

4. Sahne erwärmen, Gelatine darin auflösen. Geschmolzene Kuvertüre einrühren. Abkühlen bis die Masse leicht eindickt.

5. Creme auf die abgekühlten Böden streichen. Mindestens 2 Stunden im Kühlschrank fest werden lassen.

6. Mit geschmolzener Kuvertüre und gehackten Pistazien dekorieren. In Bentobox-Größen (ca. 6 × 6 cm) portionieren.`,

  'Mini Cheesecake': `1. Backofen auf 160 °C vorheizen. Muffinblech mit Papierförmchen auslegen.

2. Keksboden: Kekse zerbröseln, mit Butter mischen, 1 EL je Förmchen eindrücken. 5 Minuten kühlen.

3. Frischkäse glatt rühren. Zucker, Ei und Sahne einrühren. Vanillepuddingpulver unterheben.

4. Masse auf Keksböden verteilen. Bei 160 °C 20–22 Minuten backen. Im Ofen 30 Minuten abkühlen.

5. Mindestens 3 Stunden im Kühlschrank kühlen. Nach Wunsch mit Himbeermark oder Früchten toppen.`,

  'New York Cheesecake (9")': `1. Backofen auf 160 °C vorheizen. Springform (24 cm) einfetten, Boden mit Alufolie einwickeln.

2. Graham Cracker oder Vollkornkekse zerbröseln, mit Butter mischen, in die Form drücken. 10 Minuten kühlen.

3. Frischkäse (Zimmertemperatur) auf niedrigster Stufe glatt rühren. Zucker einrühren. Eier einzeln unterrühren. Sahne und Vanille einrühren. Nicht übermischen.

4. Füllung auf den Boden gießen. Im Wasserbad bei 160 °C 65–75 Minuten backen. Rand fest, Mitte wackelt leicht.

5. Im abgeschalteten Ofen mit offener Tür 1 Stunde abkühlen. Auf Raumtemperatur abkühlen. Über Nacht im Kühlschrank kühlen.

6. Rand lösen. Mit Sauerrahm-Topping oder frischen Beeren nach Wunsch dekorieren.`,

  'Opera Torte': `1. Backofen auf 200 °C vorheizen. Backblech mit Backpapier auslegen.

2. Für den Joconde-Boden: Eiweiß steif schlagen, Zucker einrühren. Eigelb aufschlagen, gemahlene Haselnüsse und Mehl unterheben. Eischnee in 3 Portionen unterheben. Auf 2–3 mm verteilen, 8–10 Minuten backen. 3 Böden ausschneiden. Auskühlen.

3. Espresso-Tränke: Espresso mit Zucker und Alkohol (optional) mischen.

4. Schokoladen-Buttercreme: Butter aufschlagen. Dunkle Kuvertüre und Glucose schmelzen, etwas abkühlen und unter die Butter rühren.

5. Schokoladenganache: Kuvertüre mit heißer Sahne zu glatter Ganache rühren.

6. Aufbau: Erster Boden mit Espresso tränken, Buttercreme aufstreichen. Zweiter Boden auflegen, tränken, Ganache aufstreichen. Dritter Boden auflegen, tränken, Oberfläche mit Ganache überziehen. Rand glätten.

7. Mindestens 4 Stunden – besser über Nacht – im Kühlschrank festigen. In saubere Rechtecke schneiden.`,

  'Passion Frucht Torte (Vegan)': `1. Backofen auf 175 °C vorheizen. Springform (26 cm) einfetten.

2. Pflanzliche Milch, Öl, Zucker und Bananen pürieren bis alles glatt ist. Maracujapüree einrühren.

3. Mehl, Backpulver, Kakao, Haferflocken und gemahlene Mandeln vermengen und unter die nasse Masse heben.

4. Teig in die Form füllen. Bei 175 °C 30 Minuten backen. Auskühlen lassen.

5. Vegane Schlagcreme steif aufschlagen. Puderzucker einrühren. Dunkle Schokolade im Wasserbad schmelzen und auskühlen lassen.

6. Torte einmal halbieren. Hälfte der Creme auf den Boden streichen. Deckelboden aufsetzen. Restliche Creme auf Oberfläche und Rand auftragen. Mit Schokolade und Maracuja dekorieren.

7. Agar Agar für einen optionalen Guss: mit etwas Maracujasaft aufkochen und über den Tortenrand gießen. Kühlen.`,

  'Popsicles': `1. Erdbeeren (TK, aufgetaut) mit Zitronensaft und braunem Zucker in einem Mixer fein pürieren.

2. Masse durch ein feines Sieb streichen um Kerne zu entfernen.

3. Nach Geschmack mit Wasser verdünnen (ca. 20 % Wasser für eine intensivere Farbe und Textur).

4. Masse in Eisförmchen oder Popsicle-Formen füllen (ca. 80 ml je Portion). Holzstäbchen einsetzen.

5. Mindestens 5 Stunden – besser über Nacht – einfrieren.

6. Zum Servieren kurz unter lauwarmem Wasser halten, um die Popsicles aus der Form zu lösen.`,

  'Pumkin Orange': `1. Backofen auf 175 °C vorheizen. Springform (24 cm) einfetten.

2. Kürbis dämpfen oder rösten, pürieren und abkühlen lassen.

3. Eier, Zucker und Joghurt cremig aufschlagen. Öl einrühren. Kürbispüree unterrühren.

4. Mehl, Backpulver, Zimt und Puderzucker sieben und unter die Masse heben.

5. Teig in die Form füllen. Bei 175 °C 40–45 Minuten backen. Auskühlen lassen.

6. Weiße Schokolade und Kondensmilch im Wasserbad schmelzen. Etwas abkühlen. Gelatine einweichen, in der Sahne auflösen und zur Schokoladenmasse geben. Orangenabrieb einrühren.

7. Creme auf dem abgekühlten Kuchen verteilen und mindestens 3 Stunden kühl stellen. Mit Kürbiskernen und Orangenzesten dekorieren.`,

  'Purple Velvet': `1. Backofen auf 175 °C vorheizen. Zwei Springformen (20 cm) einfetten und mehlen.

2. Öl, Joghurt und Zucker glatt rühren. Eier einzeln unterrühren. Himbeer- und Erdbeerpüree einrühren – das gibt die violette Farbe. Vanille hinzufügen.

3. Mehl und Backpulver sieben. Abwechselnd mit weißer Schokolade (geschmolzen) unter die Masse heben.

4. Teig auf beide Formen aufteilen. Bei 175 °C 28–32 Minuten backen. Auskühlen lassen.

5. Buttercreme: Butter aufschlagen. Beeren-Schale einrühren. Puderzucker nach und nach einarbeiten bis eine luftige Creme entsteht.

6. Ersten Boden auf Tortenplatte legen, Creme aufstreichen, zweiten Boden aufsetzen. Oberfläche und Rand mit Creme einstreichen. 1 Stunde kühlen.`,

  'Royal Raspberry': `1. Backofen auf 175 °C vorheizen. Springform (24 cm) einfetten.

2. Eier, Joghurt, Zucker und Öl glatt verrühren. Mehl und Backpulver sieben und unterheben. In die Form füllen, 30 Minuten backen. Auskühlen.

3. Gelatine in kaltem Wasser einweichen (5 Minuten). Himbeerpaste mit Kondensmilch und Zucker erwärmen. Eingeweichte Gelatine einrühren.

4. Weiße Schokolade im Wasserbad schmelzen. Sahne und Glucose leicht erwärmen, mit der Schokolade zu einer Ganache rühren.

5. Creme in zwei Portionen aufteilen. Hälfte auf den abgekühlten Boden verteilen, kühlen bis fest. Restliche Creme als Deckel auftragen.

6. Sahne steif aufschlagen, dekorativ aufspritzen. Mit frischen Himbeeren und weißer Schokolade garnieren.`,

  'Sacher Torte': `1. Backofen auf 170 °C Ober-/Unterhitze vorheizen. Springform (24 cm) einfetten und mehlen.

2. Dunkle Kuvertüre im Wasserbad schmelzen. Auf Raumtemperatur abkühlen lassen.

3. Butter und die Hälfte des Zuckers cremig aufschlagen. Geschmolzene Kuvertüre einrühren. Eigelb einzeln unterrühren.

4. Eiweiß mit restlichem Zucker zu steifem Schnee schlagen. Ein Drittel unter die Schokomasse heben um sie zu lockern.

5. Mehl sieben, abwechselnd mit restlichem Eischnee vorsichtig unterheben – möglichst wenig Luft verlieren.

6. Teig in die Form füllen. 50–55 Minuten backen. Stäbchenprobe. 10 Minuten in der Form abkühlen, dann stürzen. Vollständig auskühlen.

7. Torte waagerecht halbieren. Marillenmarmelade zwischen und auf den Schichten verstreichen, 30 Minuten trocknen lassen.

8. Milchkuvertüre mit Sahne und Glucose zur Glasur schmelzen (ca. 35 °C). Über die Torte gießen und glattstreichen. Vollständig aushärten lassen.`,

  'Schoko Cheesecake': `1. Boden: Kekse zerbröseln, mit Butter mischen, in eine Springform (22 cm) drücken. Kühlen.

2. Dunkle und helle Kuvertüre getrennt im Wasserbad schmelzen. Jeweils abkühlen lassen.

3. Frischkäse und Mascarpone auf niedrigster Stufe glatt rühren. Kuvertüre (dunkel) einrühren.

4. Sahne leicht aufschlagen (nicht ganz steif) und locker unter die Frischkäsemasse heben.

5. Hälfte der Creme auf den Boden gießen. Helle Kuvertüre in Tupfern einarbeiten für einen Marmor-Effekt. Restliche Creme auffüllen, glattstreichen.

6. Mindestens 5 Stunden – besser über Nacht – im Kühlschrank fest werden lassen. Mit Kakao bestäuben.`,

  'Skinny Cheesecake': `1. Backofen auf 170 °C vorheizen. Eine kleine Springform (20 cm) oder individuelle Ramequins einfetten.

2. Frischkäse, Quark und Erythrit glatt rühren. Proteinpulver und Stärke einrühren.

3. Eigelb unterrühren. Vanille und Mandarinensaft einrühren.

4. Eiweiß steif schlagen und in drei Portionen unter die Käsemasse heben – luftig und schonend.

5. In die Form füllen. Im Wasserbad bei 170 °C 40–45 Minuten backen bis die Ränder fest sind, die Mitte leicht wackelt.

6. Im abgeschalteten Ofen 1 Stunde abkühlen. Dann mindestens 4 Stunden im Kühlschrank kühlen. Mit Mandarinenscheiben dekorieren.`,

  'Sommer Trio': `1. Backofen auf 175 °C vorheizen. Springform (22 cm) einfetten.

2. Für den Schokoladenboden: Eier, Joghurt, Zucker und Öl rühren. Mehl, Kakao und Backpulver sieben und unterheben. Backen 25–28 Minuten. Auskühlen.

3. Drei Cremes vorbereiten: (a) dunkle Schokoladenganache (Kuvertüre dunkel + Sahne), (b) weiße Schokoladencreme (weiße Schokolade + Sahne + Gelatine), (c) Mango-Blaubeercreme (Mangopüree + Gelatine + aufgeschlagener Sahne + Blaubeeren).

4. Gelatine jeweils 5 Minuten einweichen, in der jeweiligen Crème auflösen.

5. Auf dem abgekühlten Boden nacheinander aufbauen: Schokoladenganache, fest werden lassen (30 Min. kühlen). Dann weiße Creme, kühlen. Dann Mango-Blaubeercreme als Abschluss.

6. Mindestens 4 Stunden – besser über Nacht – kühlen. Mit Mandelsplittern und Beeren garnieren.`,

  'Tiramisu': `1. Mascarpone, Sahne und Puderzucker in einer Schüssel glatt rühren bis eine cremige Masse entsteht. Vanilleextrakt unterrühren. Nicht zu lange schlagen – die Creme soll standfest aber nicht körnig sein.

2. Espresso aufbrühen und vollständig abkühlen lassen.

3. Erdbeeren waschen, trocken tupfen und in Scheiben schneiden. Einige für die Dekoration beiseitelegen.

4. Löffelbiskuits einzeln kurz (1–2 Sekunden pro Seite) in den kalten Espresso tauchen.

5. Eine Lage getränkte Biskuits in eine rechteckige Form legen. Erdbeerenscheiben darauf verteilen.

6. Die Hälfte der Mascarpone-Creme gleichmäßig auf den Biskuits verstreichen.

7. Zweite Lage Biskuits auflegen. Mit restlicher Creme abdecken und glattstreichen.

8. Oberfläche gleichmäßig mit Kakao bestäuben. Mit restlichen Erdbeeren dekorieren.

9. Mindestens 4 Stunden – besser über Nacht – im Kühlschrank ziehen lassen.`,

  'Tulpen Cupcakes': `1. Backofen auf 175 °C vorheizen. Muffinblech mit Papierförmchen auslegen (12 Stück).

2. Weiche Butter und Zucker cremig aufschlagen. Eier einzeln unterrühren.

3. Mehl und Backpulver sieben und abwechselnd mit etwas Milch unterheben.

4. Förmchen zu zwei Dritteln füllen. Bei 175 °C 18–20 Minuten backen. Stäbchenprobe. Vollständig auskühlen lassen.

5. Buttercreme: Butter hellweiß aufschlagen. Puderzucker einarbeiten. Öl und einen Spritzer Zitronensaft einrühren. In zwei Töne färben (rosa, lila).

6. Mit einem Blumenaufsatz (1M-Tülle) Tulpenmuster aufspritzen: von außen nach innen spiralförmig mit leichtem Druck. Mit essbarer Dekoration garnieren.`,

  'Valentins Brownies': `1. Backofen auf 175 °C vorheizen. Rechteckige Backform (20 × 30 cm) einfetten und mit Backpapier auslegen.

2. Öl, Zucker, Joghurt und Vollei glatt rühren. Vanille einrühren.

3. Mehl, Kakao und Backpulver sieben und unter die feuchte Masse heben – nur bis alles verbunden ist. Übermischen macht Brownies trocken.

4. Gefriergetrocknete Früchte unter den Teig heben.

5. Teig in die Form füllen und glattstreichen. Bei 175 °C 22–25 Minuten backen. Die Mitte soll leicht glänzen und noch etwas weich sein – Brownies festigen sich beim Abkühlen.

6. Vollständig auskühlen lassen, dann in Quadrate schneiden. Sahne und Mascarpone aufschlagen, Puderzucker einrühren und dekorativ aufspritzen.`,

  'Valentins Cookies': `1. Backofen auf 165 °C vorheizen. Backblech mit Backpapier auslegen.

2. Weiche Butter, Puderzucker und Pistazienpaste cremig aufschlagen. Eigelb und Zitronenabrieb einrühren. Vanilleextrakt hinzufügen.

3. Mehl sieben und unter die Buttermasse rühren bis ein weicher Mürbteig entsteht. Nicht kneten.

4. Teig auf einer bemehlten Fläche 5 mm dick ausrollen. Herzformen ausstechen.

5. Auf das Backblech legen. Bei 165 °C 12–14 Minuten backen bis die Ränder leicht goldbraun sind.

6. Auskühlen lassen. Eiweiß und Puderzucker zu Royal Icing aufschlagen und die Kekse dekorieren. Mindestens 1 Stunde trocknen lassen.`,

  'Vanilla Cupcake': `1. Backofen auf 175 °C vorheizen. Muffinblech mit Papierförmchen auslegen (12 Stück).

2. Weiche Butter und Zucker 4 Minuten cremig aufschlagen. Eier einzeln unterrühren. Vanilleextrakt hinzufügen.

3. Mehl und Backpulver sieben. Abwechselnd mit der Milch unter die Buttermasse heben – mit Mehl beginnen und enden.

4. Förmchen zu zwei Dritteln füllen. Bei 175 °C 18–22 Minuten backen. Stäbchenprobe. Vollständig auskühlen.

5. Vanille-Buttercreme: Butter hell aufschlagen. Puderzucker einarbeiten. Milch und Vanille einrühren bis eine luftige, streichfähige Creme entsteht.

6. Creme in einen Spritzbeutel mit Sterntülle füllen. Swirl-Muster auf jeden Cupcake aufspritzen. Mit Streuseln oder Zuckerperlen dekorieren.`,

  'Vanille Parfait': `1. Eigelb und Zucker in einer Metallschüssel über dem Wasserbad (nicht kochendes Wasser) cremig aufschlagen bis die Masse hell, warm und deutlich eingedickt ist (ca. 8 Minuten). Schüssel vom Herd nehmen.

2. Bourbon-Vanille einrühren. Masse abkühlen lassen – dabei gelegentlich rühren.

3. TK-Erdbeeren im Kühlschrank antauen, mit Puderzucker und Zitronensaft pürieren. Durch ein Sieb streichen.

4. Weiße Schokolade im Wasserbad schmelzen und in die abgekühlte Eigelbcreme einrühren.

5. Sahne mit einer Prise Salz steif aufschlagen. In drei Portionen unter die Schokoladen-Eigelbmasse heben.

6. Erdbeer-Coulis in die Masse einmarmorieren (nicht vollständig einrühren). In Parfait-Formen oder eine Kastenform füllen.

7. Mindestens 5 Stunden – besser über Nacht – einfrieren. Vor dem Servieren 5 Minuten antauen lassen.`,

  'Vegane Cookies': `1. Backofen auf 170 °C vorheizen. Backblech mit Backpapier auslegen.

2. Weiche Margarine, weißen Zucker und braunen Zucker 3 Minuten cremig aufschlagen. Pflanzenmilch und Vanille einrühren.

3. Weizenmehl, Reismehl, Maismehl, Natron und Salz sieben. Unter die Margarine-Masse rühren bis ein weicher Teig entsteht.

4. Mit einem Eisportionierer gleichmäßige Häufchen (ca. 35 g) auf das Blech setzen, mit genügend Abstand. Leicht flachdrücken.

5. Bei 170 °C 12–14 Minuten backen bis die Ränder goldbraun sind. Mitte darf noch weich wirken.

6. 5 Minuten auf dem Blech abkühlen, dann auf ein Gitter übertragen. Vollständig auskühlen lassen.`,

};

async function main() {
  const { access_token: token } = await api('/auth/login', 'POST', { email: 'admin@cakeerp.com', password: 'admin123' });
  const recipes = await api('/recipes', 'GET', null, token);
  console.log(`Found ${recipes.length} recipes\n`);

  let filled = 0, skipped = 0, noProc = 0;

  for (const recipe of recipes) {
    if (recipe.notes && recipe.notes.trim().length > 0) {
      console.log(`  = ${recipe.name.padEnd(40)} already has notes`);
      skipped++;
      continue;
    }

    const notes = PROCEDURES[recipe.name];
    if (!notes) {
      console.log(`  ⚠ No procedure defined for: "${recipe.name}"`);
      noProc++;
      continue;
    }

    await api(`/recipes/${recipe.id}`, 'PATCH', { notes }, token);
    console.log(`  ✓ ${recipe.name}`);
    filled++;
  }

  console.log(`\n✅ Filled: ${filled}, Already had notes: ${skipped}, No procedure defined: ${noProc}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

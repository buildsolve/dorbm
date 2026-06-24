const BASE = 'http://localhost:4000/api';
async function api(path, method = 'GET', body = null, token = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

const PROCEDURES = {
  'Banana Bread': `1. Backofen auf 175 °C Ober-/Unterhitze vorheizen. Eine Kastenform (ca. 25 cm) einfetten und mit Backpapier auslegen.

2. Reife Bananen in einer großen Schüssel mit einer Gabel gründlich zerdrücken, bis eine cremige Masse entsteht. Je reifer die Bananen, desto süßer wird das Brot.

3. Weiche Margarine, weißen Zucker und braunen Zucker zur Bananenmasse geben und mit dem Handmixer ca. 3 Minuten cremig aufschlagen.

4. Eier einzeln unterrühren. Vanilleextrakt hinzufügen und alles gut vermengen.

5. Mehl, Backpulver und Natron in einer separaten Schüssel sieben. Die trockenen Zutaten in zwei Portionen unter die feuchte Masse heben – nur bis alles gerade verbunden ist. Nicht zu lange rühren, sonst wird das Brot zäh.

6. Teig in die vorbereitete Form füllen und die Oberfläche glattstreichen. Optional: eine halbe Banane längs auf den Teig legen.

7. Im vorgeheizten Ofen 55–60 Minuten backen. Nach 30 Minuten prüfen – bei zu dunkler Oberfläche mit Alufolie abdecken. Stäbchenprobe: Wenn kein Teig klebt, ist das Brot fertig.

8. Brot 15 Minuten in der Form abkühlen lassen, dann auf ein Kuchengitter stürzen und vollständig auskühlen lassen, bevor es angeschnitten wird.`,

  'Baked Cheesecake': `1. Backofen auf 160 °C Ober-/Unterhitze vorheizen. Eine Springform (26 cm) einfetten. Den Boden mit Alufolie doppelt einwickeln – das verhindert Wassereintritte beim Wasserbad.

2. Für den Boden: Butterkekse fein zerbröseln, mit geschmolzener Butter mischen und gleichmäßig auf den Boden der Form drücken. 10 Minuten im Kühlschrank festigen lassen.

3. Frischkäse in einer großen Schüssel mit dem Mixer auf niedrigster Stufe glatt rühren. Zucker hinzufügen und einarbeiten – nicht zu viel Luft einschlagen, sonst reißt die Oberfläche beim Backen.

4. Eier einzeln bei niedriger Geschwindigkeit unterrühren. Jedes Ei vollständig einarbeiten, bevor das nächste hinzukommt.

5. Sahne, Vanillepuddingpulver und eine Prise Salz unterrühren, bis eine glatte, homogene Masse entsteht.

6. Füllung auf den Keksboden gießen und glattstreichen. Springform in eine tiefe Backform stellen. Kochendes Wasser bis zur Hälfte der Springform einfüllen (Wasserbad).

7. Im vorgeheizten Ofen 55–65 Minuten backen. Der Rand soll fest sein, die Mitte darf noch leicht wackeln – sie festigt sich beim Abkühlen.

8. Ofen ausschalten, Tür einen Spalt öffnen und den Kuchen 1 Stunde im abkühlenden Ofen stehen lassen. Dieser Schritt verhindert Risse.

9. Aus dem Wasserbad nehmen, vollständig auskühlen lassen. Mindestens 4 Stunden – besser über Nacht – im Kühlschrank kühlen, bevor der Rand der Springform gelöst wird.`,

  'Sacher Torte': `1. Backofen auf 170 °C Ober-/Unterhitze vorheizen. Eine Springform (24 cm) einfetten und mehlen.

2. Kuvertüre (dunkel 55 %) im Wasserbad oder in der Mikrowelle schmelzen. Auf Raumtemperatur abkühlen lassen – sie darf nicht mehr heiß sein, wenn sie zu den Eiern kommt.

3. Butter und die Hälfte des Zuckers in einer Schüssel cremig aufschlagen. Die geschmolzene Kuvertüre einrühren. Eigelbe einzeln unterrühren.

4. Eiweiß mit dem restlichen Zucker zu steifem Schnee schlagen. Ein Drittel des Eischnees unter die Schokoladenmasse heben, um sie zu lockern.

5. Mehl sieben und abwechselnd mit dem restlichen Eischnee vorsichtig unterheben – möglichst wenig Luft verlieren.

6. Teig in die vorbereitete Form füllen. Im Ofen 50–55 Minuten backen. Stäbchenprobe: trocken = fertig. Boden 10 Minuten in der Form abkühlen, dann stürzen und vollständig auskühlen.

7. Torte einmal waagerecht halbieren. Marmeladenschicht auf den unteren Boden streichen, Deckel aufsetzen. Auch die Oberfläche und den Rand dünn mit Marillenmarmelade bestreichen. 30 Minuten trocknen lassen.

8. Für den Schokoladenguss: Kuvertüre (Milch 31 %) mit Sahne und Glucose erhitzen und glatt rühren. Auf etwa 35 °C abkühlen lassen, dann über die Torte gießen und glattstreichen. Vollständig aushärten lassen.`,

  'Tiramisu': `1. Mascarpone, Sahne und Puderzucker in einer Schüssel glatt rühren, bis eine cremige Masse entsteht. Vanilleextrakt unterrühren. Nicht zu lange aufschlagen – die Creme soll standfest, aber nicht körnig sein.

2. Espresso (oder starken Kaffee) aufbrühen und vollständig abkühlen lassen. Optional: mit einem Schuss Amaretto oder Rum verfeinern.

3. Erdbeeren waschen, trocken tupfen und in Scheiben schneiden. Einige für die Dekoration beiseitelegen.

4. Löffelbiskuits einzeln kurz (1–2 Sekunden pro Seite) in den kalten Espresso tauchen – sie sollen getränkt, aber nicht matschig sein.

5. Eine Lage getränkte Löffelbiskuits in eine rechteckige Form (ca. 20 × 30 cm) legen. Erdbeerenscheiben darauf verteilen.

6. Die Hälfte der Mascarpone-Creme gleichmäßig auf den Biskuits verstreichen.

7. Eine zweite Lage Löffelbiskuits (getränkt) auflegen. Mit der restlichen Creme abdecken und glattstreichen.

8. Oberfläche gleichmäßig mit Kakao bestäuben. Mit den beiseitegelegten Erdbeeren dekorieren.

9. Mindestens 4 Stunden – besser über Nacht – im Kühlschrank ziehen lassen, damit sich die Schichten verbinden und der Geschmack entwickelt. Erst kurz vor dem Servieren aus dem Kühlschrank nehmen.`,

  'Karotten Kuchen': `1. Backofen auf 175 °C Ober-/Unterhitze vorheizen. Eine Springform (26 cm) einfetten und mehlen.

2. Möhren schälen und fein reiben. Haselnüsse grob mahlen oder hacken. Beides beiseitelegen.

3. Eier und Zucker in einer Schüssel mit dem Mixer ca. 5 Minuten aufschlagen, bis die Masse hell und cremig ist. Sonnenblumenöl langsam einrühren.

4. Mehl, Mondamin, Backpulver und Zimt sieben und mit den geriebenen Möhren und den Haselnüssen unter die Eimasse heben – kurz und zügig, nicht zu lange rühren.

5. Teig in die vorbereitete Form geben und glattstreichen. Im Ofen 40–45 Minuten backen. Stäbchenprobe: trocken = fertig. Auskühlen lassen.

6. Für das Frischkäse-Frosting: Frischkäse mit Puderzucker und einem Spritzer Zitronensaft glatt rühren, bis eine streichfähige Creme entsteht.

7. Abgekühlten Kuchen waagerecht halbieren. Untere Hälfte mit einem Teil des Frostings bestreichen, obere Hälfte aufsetzen. Oberfläche und Rand mit dem restlichen Frosting einstreichen.

8. Mit Marzipan-Karotten dekorieren und mindestens 1 Stunde im Kühlschrank fest werden lassen, bevor der Kuchen angeschnitten wird.`,
};

async function main() {
  const { access_token: token } = await api('/auth/login', 'POST', { email: 'admin@cakeerp.com', password: 'admin123' });
  const recipes = await api('/recipes', 'GET', null, token);

  for (const [name, notes] of Object.entries(PROCEDURES)) {
    const recipe = recipes.find(r => r.name === name);
    if (!recipe) { console.log(`  ⚠ Not found: ${name}`); continue; }
    await api(`/recipes/${recipe.id}`, 'PATCH', { notes }, token);
    console.log(`  ✓ ${name}`);
  }
  console.log('\n✅ Done');
}

main().catch(e => { console.error(e.message); process.exit(1); });

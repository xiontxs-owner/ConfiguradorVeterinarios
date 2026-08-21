import assert from 'assert';
import '../js/voiceOrder.js';

const voice = globalThis.KantekVoiceOrder;

function compact(items) {
  return items.map(function (item) {
    const kg = voice.resolveSpokenKg(
      item.product,
      item.kgSpoken,
      voice.DEFAULT_KG[item.product]
    );
    return item.product + ':' + kg + 'x' + item.qty;
  });
}

function expectPhrase(phrase, expected) {
  const items = voice.parseVoiceOrder(phrase);
  const got = compact(items);
  assert.deepStrictEqual(
    got,
    expected,
    '«' + phrase + '»\n  got: ' + JSON.stringify(got) + '\n  exp: ' + JSON.stringify(expected)
  );
}

expectPhrase('Cachorro: 2 kg 5 piezas, 8 kg 2 piezas', [
  'cachorro:2x5',
  'cachorro:8x2',
]);

expectPhrase('Adulto: 2 piezas de 2 kg, 8 kg 1 pieza', [
  'adulto:2x2',
  'adulto:8x1',
]);

expectPhrase('Veteranos: 1 de 2 kg y 1 de 15', [
  'veteranos:2x1',
  'veteranos:15x1',
]);

expectPhrase('Felinos 1.5 kg 4, 3 kg 2', [
  'felinos:1.5x4',
  'felinos:3x2',
]);

expectPhrase(
  'Cachorro: 2 kg 5 piezas, 8 kg 2 piezas. Adulto: 2 piezas de 2 kg, 8 kg 1 pieza. Veteranos: 1 de 2 kg y 1 de 15. Felinos 1.5 kg 4, 3 kg 2',
  [
    'cachorro:2x5',
    'cachorro:8x2',
    'adulto:2x2',
    'adulto:8x1',
    'veteranos:2x1',
    'veteranos:15x1',
    'felinos:1.5x4',
    'felinos:3x2',
  ]
);

expectPhrase('20 de adulto 20', ['adulto:20x20']);
expectPhrase('ocho de felinos uno punto cinco', ['felinos:1.5x8']);
expectPhrase('2 de adulto 2 y 5 de cachorro 8', [
  'adulto:2x2',
  'cachorro:8x5',
]);
expectPhrase('veinte piezas de adulto de 20 kilos', ['adulto:20x20']);
expectPhrase('cachorro 2 5 8 2', ['cachorro:2x5', 'cachorro:8x2']);
expectPhrase('Felinos kilo y medio 4 y 3 kilos 2', [
  'felinos:1.5x4',
  'felinos:3x2',
]);
expectPhrase('adulto 2 piezas 8 kg', ['adulto:8x2']);
expectPhrase('razas pequeñas 2 kg 3 y 8 kg 1', [
  'razas-pequenas:2x3',
  'razas-pequenas:8x1',
]);
expectPhrase('activo 2 de 20', ['activo:20x2']);
expectPhrase('adulto 20', ['adulto:20x1']);
expectPhrase('cachorro dos kilos cinco piezas y ocho kilos dos', [
  'cachorro:2x5',
  'cachorro:8x2',
]);
expectPhrase('3 de cachorro 2', ['cachorro:2x3']);
expectPhrase('Cachorro: 2kg 5 pzas, 8kg 2 pzas', [
  'cachorro:2x5',
  'cachorro:8x2',
]);
expectPhrase('Cachorro 2 kg 5, 8 kg 2 y Adulto 20 kg 3', [
  'cachorro:2x5',
  'cachorro:8x2',
  'adulto:20x3',
]);

console.log('voiceOrder tests: OK');

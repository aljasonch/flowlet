import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('no secrets in client source', () async {
    final lib = Directory('lib');
    await for (final f in lib.list(recursive: true)) {
      if (f is File && f.path.endsWith('.dart')) {
        final text = await f.readAsString();
        expect(text, isNot(contains('service_role')));
        expect(text, isNot(contains('COINGECKO_API_KEY')));
      }
    }
  });
}

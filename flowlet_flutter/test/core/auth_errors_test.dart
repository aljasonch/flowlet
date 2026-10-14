import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/auth_errors.dart';

void main() {
  test('flags the signed-out StateError only', () {
    expect(isNotSignedInError(StateError('Not signed in')), isTrue);
    expect(isNotSignedInError(StateError('other problem')), isFalse);
    expect(isNotSignedInError(ArgumentError('x')), isFalse);
  });
}

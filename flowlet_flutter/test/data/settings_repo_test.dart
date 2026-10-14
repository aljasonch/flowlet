import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/data/settings_repo.dart';

class _PgError implements Exception {
  _PgError(this.code);
  final String code;
  @override
  String toString() => 'duplicate';
}

void main() {
  group('validateMonthStartDay', () {
    test('only 1..31 passes', () {
      expect(validateMonthStartDay(0), 'Month start day must be between 1 and 31');
      expect(validateMonthStartDay(32), 'Month start day must be between 1 and 31');
      expect(validateMonthStartDay(-5), 'Month start day must be between 1 and 31');
      expect(validateMonthStartDay(1), isNull);
      expect(validateMonthStartDay(25), isNull);
      expect(validateMonthStartDay(31), isNull);
    });
  });

  group('rate validation', () {
    test('blank or null clears the rate', () {
      expect(validateUsdIdrRate(null), isNull);
      expect(validateUsdIdrRate(''), isNull);
      expect(validateUsdIdrRate('   '), isNull);
      expect(normalizeUsdIdrRate(null), isNull);
      expect(normalizeUsdIdrRate('  '), isNull);
    });

    test('zero and negative rates are blocked', () {
      expect(validateUsdIdrRate('0'), 'Rate must be greater than 0');
      expect(validateUsdIdrRate('-5'), 'Rate must be greater than 0');
      expect(validateUsdIdrRate('0,00'), 'Rate must be greater than 0');
    });

    test('unparseable rates are blocked without float math', () {
      expect(validateUsdIdrRate('abc'), 'Invalid rate');
      expect(validateUsdIdrRate('1,2,3'), 'Invalid rate');
      expect(validateUsdIdrRate('--5'), 'Invalid rate');
    });

    test('dot-decimal strings stay exact via Decimal', () {
      expect(normalizeUsdIdrRate('15750.25'), '15750.25');
      expect(normalizeUsdIdrRate('16200'), '16200');
      expect(validateUsdIdrRate('15750.25'), isNull);
    });

    test('Indonesian comma decimals normalize to dot strings', () {
      expect(normalizeUsdIdrRate('15.750,25'), '15750.25');
      expect(normalizeUsdIdrRate('16200,5'), '16200.5');
      expect(validateUsdIdrRate('15.750,25'), isNull);
    });
  });

  group('validateRefName', () {
    test('blank and overlong names are blocked', () {
      expect(validateRefName('   '), 'Name cannot be empty');
      expect(validateRefName('x' * 51), 'Name cannot exceed 50 characters');
      expect(validateRefName('Food'), isNull);
      expect(validateRefName('  Bills  '), isNull);
    });
  });

  group('isDuplicateNameError', () {
    test('PostgREST unique-violation code maps to the friendly message', () {
      expect(isDuplicateNameError(_PgError('23505')), isTrue);
      expect(isDuplicateNameError(_PgError('42501')), isFalse);
      expect(isDuplicateNameError(StateError('nope')), isFalse);
      expect(isDuplicateNameError(ArgumentError('x')), isFalse);
    });
  });

  group('fetchProfile', () {
    test('maps month day, currency and decimal-string rate verbatim', () async {
      final profile = await fetchProfile(
        fetcher: () async => {
          'month_start_day': 25,
          'currency': 'IDR',
          'usd_idr_rate': '15750.25',
          'usd_idr_rate_updated_at': '2026-10-14T00:00:00Z',
        },
      );
      expect(profile.monthStartDay, 25);
      expect(profile.currency, 'IDR');
      expect(profile.rate, '15750.25');
      expect(profile.rateUpdatedAt, '2026-10-14T00:00:00Z');
    });

    test('missing row falls back to defaults', () async {
      final profile = await fetchProfile(fetcher: () async => null);
      expect(profile.monthStartDay, 1);
      expect(profile.currency, 'IDR');
      expect(profile.rate, isNull);
    });

    test('getMonthStartDay and getUsdIdrRate delegate to the profile', () async {
      Future<Map?> fetcher() async => {
            'month_start_day': 25,
            'currency': 'IDR',
            'usd_idr_rate': '16200',
            'usd_idr_rate_updated_at': null,
          };
      expect(await getMonthStartDay(fetcher: fetcher), 25);
      expect(await getUsdIdrRate(fetcher: fetcher), '16200');
    });
  });

  group('writes delegate to injected callers', () {
    test('setMonthStartDay rejects out-of-range days before writing', () async {
      var calls = 0;
      await expectLater(
        setMonthStartDay(0, update: (_) async => calls++),
        throwsArgumentError,
      );
      await expectLater(
        setMonthStartDay(32, update: (_) async => calls++),
        throwsArgumentError,
      );
      expect(calls, 0);
      await setMonthStartDay(25, update: (_) async => calls++);
      expect(calls, 1);
    });

    test('setUsdIdrRate passes Decimal strings, never doubles', () async {
      Map<String, dynamic>? got;
      await setUsdIdrRate('15750.25', update: (p) async => got = p);
      expect(got?['usd_idr_rate'], '15750.25');
      expect(got?['usd_idr_rate_updated_at'], isNotNull);
    });

    test('setUsdIdrRate with blank clears rate and timestamp', () async {
      Map<String, dynamic>? got;
      await setUsdIdrRate('  ', update: (p) async => got = p);
      expect(got?['usd_idr_rate'], isNull);
      expect(got?['usd_idr_rate_updated_at'], isNull);
    });

    test('setUsdIdrRate rejects zero and garbage', () async {
      var calls = 0;
      await expectLater(
        setUsdIdrRate('0', update: (_) async => calls++),
        throwsArgumentError,
      );
      await expectLater(
        setUsdIdrRate('abc', update: (_) async => calls++),
        throwsArgumentError,
      );
      expect(calls, 0);
    });

    test('addCategory maps unique violations to the friendly error', () async {
      expect(
        () => addCategory(
          'Food',
          insert: (_) async => throw _PgError('23505'),
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            'That name already exists',
          ),
        ),
      );
      expect(
        () => addCategory('  ', insert: (_) async {}),
        throwsArgumentError,
      );
      var calls = 0;
      await addCategory('  Bills ', insert: (_) async => calls++);
      expect(calls, 1);
    });

    test('renameCategory validates and maps duplicates', () async {
      expect(
        () => renameCategory(
          'c1',
          'Food',
          update: (_, __) async => throw _PgError('23505'),
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            'That name already exists',
          ),
        ),
      );
      expect(
        () => renameCategory('c1', '', update: (_, __) async {}),
        throwsArgumentError,
      );
    });

    test('archive toggles pass the id and flag through', () async {
      String? gotId;
      Map<String, dynamic>? gotPayload;
      await setCategoryArchived(
        'c1',
        true,
        update: (id, p) async {
          gotId = id;
          gotPayload = p;
        },
      );
      expect(gotId, 'c1');
      expect(gotPayload?['is_archived'], isTrue);

      String? gotSourceId;
      await addIncomeSource('Salary', insert: (_) async => gotSourceId = 'ok');
      expect(gotSourceId, 'ok');
      await renameIncomeSource('s1', 'Pay', update: (_, __) async {});
      await setSourceArchived('s1', false, update: (_, __) async {});
    });

    test('fetchCategories maps archived flags', () async {
      final refs = await fetchCategories(
        fetcher: () async => [
          {'id': 'c1', 'name': 'Food', 'is_archived': false},
          {'id': 'c2', 'name': 'Old', 'is_archived': true},
        ],
      );
      expect(refs, hasLength(2));
      expect(refs.first.name, 'Food');
      expect(refs.first.isArchived, isFalse);
      expect(refs.last.isArchived, isTrue);
    });
  });

  group('isNotSignedInError', () {
    test('maps the signed-out StateError to login', () {
      expect(isNotSignedInError(StateError('Not signed in')), isTrue);
      expect(isNotSignedInError(StateError('other')), isFalse);
    });
  });
}

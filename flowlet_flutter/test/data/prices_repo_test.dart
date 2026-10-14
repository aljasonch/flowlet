import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/data/prices_repo.dart';

void main() {
  test('parseRefreshBody parses throttled shape', () {
    final r = parseRefreshBody({'refreshed': false, 'reason': 'throttled'});
    expect(r.refreshed, isFalse);
    expect(r.reason, 'throttled');
    expect(r.updated, 0);
  });

  test('parseRefreshBody parses provider_error shape', () {
    final r = parseRefreshBody({'refreshed': false, 'reason': 'provider_error'});
    expect(r.refreshed, isFalse);
    expect(r.reason, 'provider_error');
    expect(r.updated, 0);
  });

  test('parseRefreshBody parses success shape', () {
    final r = parseRefreshBody({
      'refreshed': true,
      'updated': 3,
      'failed': <String>[],
      'fetchedAt': '2026-10-14T02:00:00.000Z',
    });
    expect(r.refreshed, isTrue);
    expect(r.reason, isNull);
    expect(r.updated, 3);
  });

  test('refreshPrices throws when unauthenticated', () async {
    expect(
      refreshPrices(
        appBaseUrl: 'https://example.com',
        tokenProvider: () async => null,
      ),
      throwsA(isA<StateError>()),
    );
  });

  test('refreshPrices throws unauthorized on 401', () async {
    Future<RefreshHttpResponse> fake(Uri url, Map<String, String> headers) async {
      return const RefreshHttpResponse(401, '{"error":"Unauthorized"}');
    }

    expect(
      refreshPrices(
        appBaseUrl: 'https://example.com',
        tokenProvider: () async => 'jwt-token',
        poster: fake,
      ),
      throwsA(isA<StateError>()),
    );
  });

  test('refreshPrices sends Bearer token to refresh endpoint', () async {
    Uri? gotUrl;
    Map<String, String>? gotHeaders;
    Future<RefreshHttpResponse> fake(Uri url, Map<String, String> headers) async {
      gotUrl = url;
      gotHeaders = headers;
      return const RefreshHttpResponse(
        200,
        '{"refreshed":true,"updated":2,"failed":[],"fetchedAt":"2026-10-14T02:00:00.000Z"}',
      );
    }

    final r = await refreshPrices(
      appBaseUrl: 'https://example.com',
      tokenProvider: () async => 'jwt-token',
      poster: fake,
    );
    expect(gotUrl.toString(),
        'https://example.com/api/prices/refresh');
    expect(gotHeaders?['Authorization'], 'Bearer jwt-token');
    expect(r.refreshed, isTrue);
    expect(r.updated, 2);
  });

  test('refreshPrices maps throttled body without collapsing to zero/null',
      () async {
    Future<RefreshHttpResponse> fake(Uri url, Map<String, String> headers) async {
      return const RefreshHttpResponse(
        200,
        '{"refreshed":false,"reason":"throttled"}',
      );
    }

    final r = await refreshPrices(
      appBaseUrl: 'https://example.com',
      tokenProvider: () async => 'jwt-token',
      poster: fake,
    );
    expect(r.refreshed, isFalse);
    expect(r.reason, 'throttled');
    expect(r.updated, 0);
  });

  test('refreshPrices maps provider_error body', () async {
    Future<RefreshHttpResponse> fake(Uri url, Map<String, String> headers) async {
      return const RefreshHttpResponse(
        200,
        '{"refreshed":false,"reason":"provider_error"}',
      );
    }

    final r = await refreshPrices(
      appBaseUrl: 'https://example.com',
      tokenProvider: () async => 'jwt-token',
      poster: fake,
    );
    expect(r.refreshed, isFalse);
    expect(r.reason, 'provider_error');
  });
}

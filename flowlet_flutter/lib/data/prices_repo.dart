import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:flowlet_flutter/core/supabase_client.dart';

class RefreshResult {
  final bool refreshed;
  final String? reason;
  final int updated;
  const RefreshResult(this.refreshed, this.reason, this.updated);
}

class RefreshHttpResponse {
  final int statusCode;
  final String body;
  const RefreshHttpResponse(this.statusCode, this.body);
}

typedef TokenProvider = Future<String?> Function();
typedef RefreshPoster = Future<RefreshHttpResponse> Function(
  Uri url,
  Map<String, String> headers,
);

Future<String?> _defaultToken() => currentAccessToken();

Future<RefreshHttpResponse> _defaultPost(
  Uri url,
  Map<String, String> headers,
) async {
  final res = await http
      .post(url, headers: headers)
      .timeout(const Duration(seconds: 10));
  return RefreshHttpResponse(res.statusCode, res.body);
}

/// Pure parser for the Next.js refresh-route response shapes:
/// success `{refreshed:true, updated, failed, fetchedAt}`, throttled
/// `{refreshed:false, reason:'throttled'}` and provider failure
/// `{refreshed:false, reason:'provider_error'}`. Missing `updated`
/// defaults to 0; nothing is collapsed to zero or null.
RefreshResult parseRefreshBody(Map<String, dynamic> body) {
  final updated = body['updated'];
  return RefreshResult(
    body['refreshed'] == true,
    body['reason'] as String?,
    updated is num ? updated.toInt() : 0,
  );
}

/// Refreshes crypto prices via the Next.js route (the CoinGecko key never
/// lives in the client). Cached quotes stay untouched server-side on
/// provider_error/throttled responses.
Future<RefreshResult> refreshPrices({
  required String appBaseUrl,
  TokenProvider? tokenProvider,
  RefreshPoster? poster,
}) async {
  final token = await (tokenProvider ?? _defaultToken)();
  if (token == null) throw StateError('not authenticated');
  final base = appBaseUrl.endsWith('/')
      ? appBaseUrl.substring(0, appBaseUrl.length - 1)
      : appBaseUrl;
  final res = await (poster ?? _defaultPost)(
    Uri.parse('$base/api/prices/refresh'),
    {'Authorization': 'Bearer $token'},
  );
  if (res.statusCode == 401) throw StateError('unauthorized');
  final body = jsonDecode(res.body) as Map<String, dynamic>;
  return parseRefreshBody(body);
}

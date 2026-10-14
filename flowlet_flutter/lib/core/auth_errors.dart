/// True for the signed-out error thrown when a repo helper finds no
/// Supabase session (`StateError('Not signed in')`). Screens map this to a
/// login redirect alongside AuthException.
bool isNotSignedInError(Object error) =>
    error is StateError && error.message.contains('Not signed in');

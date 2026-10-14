import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class DashboardPlaceholder extends StatelessWidget {
  const DashboardPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Dashboard'));
  }
}

class TxPlaceholder extends StatelessWidget {
  const TxPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Transactions'));
  }
}

class PortfolioPlaceholder extends StatelessWidget {
  const PortfolioPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Portfolio'));
  }
}

class DebtsPlaceholder extends StatelessWidget {
  const DebtsPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Debts'));
  }
}

class _Destination {
  const _Destination(this.path, this.label, this.icon);
  final String path;
  final String label;
  final IconData icon;
}

const _destinations = [
  _Destination('/', 'Dashboard', Icons.dashboard_outlined),
  _Destination('/transactions', 'Transactions', Icons.swap_horiz),
  _Destination('/debts', 'Debts', Icons.scale_outlined),
  _Destination('/portfolio', 'Portfolio', Icons.business_center_outlined),
  _Destination('/settings', 'Settings', Icons.settings_outlined),
];

int _indexForLocation(String location) {
  for (var i = _destinations.length - 1; i >= 1; i--) {
    if (location == _destinations[i].path ||
        location.startsWith('${_destinations[i].path}/') ||
        location.startsWith('${_destinations[i].path}?')) {
      return i;
    }
  }
  return 0;
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: Theme.of(context).colorScheme.errorContainer,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.wifi_off,
            size: 18,
            color: Theme.of(context).colorScheme.onErrorContainer,
          ),
          const SizedBox(width: 8),
          Text(
            'You are offline',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onErrorContainer,
            ),
          ),
        ],
      ),
    );
  }
}

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child, this.isOffline = false});

  final Widget child;
  final bool isOffline;

  void _go(BuildContext context, int index) {
    context.go(_destinations[index].path);
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = _indexForLocation(location);

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 1024;
        return Scaffold(
          body: SafeArea(
            child: Column(
              children: [
                if (isOffline) const OfflineBanner(),
                Expanded(
                  child: wide
                      ? Row(
                          children: [
                            NavigationRail(
                              selectedIndex: index,
                              onDestinationSelected: (i) => _go(context, i),
                              labelType: NavigationRailLabelType.all,
                              destinations: [
                                for (final d in _destinations)
                                  NavigationRailDestination(
                                    icon: Icon(d.icon),
                                    label: Text(d.label),
                                  ),
                              ],
                            ),
                            const VerticalDivider(width: 1),
                            Expanded(child: child),
                          ],
                        )
                      : child,
                ),
              ],
            ),
          ),
          bottomNavigationBar: wide
              ? null
              : NavigationBar(
                  selectedIndex: index,
                  onDestinationSelected: (i) => _go(context, i),
                  destinations: [
                    for (final d in _destinations)
                      NavigationDestination(icon: Icon(d.icon), label: d.label),
                  ],
                ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';

void main() {
  runApp(const FlowletApp());
}

class FlowletApp extends StatelessWidget {
  const FlowletApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flowlet',
      theme: ThemeData(useMaterial3: true),
      home: const Scaffold(
        body: Center(child: Text('Flowlet')),
      ),
    );
  }
}

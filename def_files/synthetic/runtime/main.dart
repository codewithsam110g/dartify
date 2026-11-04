// Dart side of the runtime interop probe. Expected output: main.expected.
import 'package:dc/runtime/probe.dart';

void main() async {
  print(join(",", "a", "b"));
  print(join("-"));
  print(overloaded_1("x"));
  print(overloaded_2(3));
  final counter = Counter(1);
  counter.increment_1();
  print(counter.value);
  counter.increment_2(5);
  print(counter.value);
  final stepped = Counter.overload2(10, 3);
  stepped.increment_1();
  print(stepped.value);
  print(Counter.create().value);
  print(counter.JS$_secret);
  final doubler = Doubler(21);
  print(doubler.double());
  final dict = makeDict();
  print(dict["a"]);
  dict["b"] = 7;
  print(dict["b"]);
  print(describe(Options(name: "n", size: 2)));
  print(describe(Options(name: "m")));
  print(await delay(4).toFuture());
  print(Color.Green);
  print(Config.version);
  print(Mode.A + Mode.B);
}

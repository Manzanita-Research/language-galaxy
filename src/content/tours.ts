import type { Tour } from '../domain/tour'

// Narrated paths through the galaxy. Snippet sources are template literals
// so code keeps its own indentation; they start at column zero on purpose.

export const tours: ReadonlyArray<Tour> = [
  {
    id: 'effect',
    title: 'Where Effect came from',
    question: 'Why does modern TypeScript code look like Haskell?',
    steps: [
      {
        star: 'field-category',
        title: 'Composition, formalised',
        body: 'Start in 1945, far from any computer. Eilenberg and Mac Lane wanted to compare structures across mathematics and found that the arrows between things mattered more than the things. One later construction, the monad, packages a value together with some context and a lawful way to chain steps. Nobody expected programmers to care.',
        snippets: [],
      },
      {
        star: 'moggi',
        title: 'Effects are a monad',
        body: 'In 1989 Eugenio Moggi noticed that state, exceptions and I/O all fit the monad’s shape: a type M a for “a computation that produces an a”, and a bind that feeds one computation’s result into the next. Philip Wadler read it and saw a way to write effectful code in a pure language.',
        snippets: [
          {
            label: 'The monad interface, as Haskell later wrote it',
            source: `return :: a -> m a
(>>=)  :: m a -> (a -> m b) -> m b`,
          },
        ],
      },
      {
        star: 'haskell',
        title: 'IO becomes a value',
        body: 'Haskell 1.3 (1996) made I/O a value of type IO a, and do-notation made a chain of binds read like ordinary steps. A Haskell program is a description of effects that the runtime performs; defining one runs nothing. That single decision is the ancestor of everything else on this tour.',
        snippets: [
          {
            label: 'Haskell, with do-notation',
            source: `main :: IO ()
main = do
  contents <- readFile "notes.txt"
  let n = length (lines contents)
  putStrLn ("lines: " ++ show n)`,
          },
          {
            label: 'The same program, without the sugar',
            source: `main :: IO ()
main = readFile "notes.txt" >>= \\contents ->
  putStrLn ("lines: " ++ show (length (lines contents)))`,
          },
        ],
      },
      {
        star: 'scalaz',
        title: 'The JVM imports Haskell',
        body: 'Scala’s implicits could encode type classes, and from 2008 Scalaz used them to bring Functor, Monad and the rest to the JVM. It was dense and much argued over, but it trained a community to think in Haskell’s abstractions. Its IO type, rewritten for Scalaz 8, is where ZIO began.',
        snippets: [
          {
            label: 'Scalaz: one function for every Functor',
            source: `import scalaz._, Scalaz._

def double[F[_]: Functor](fa: F[Int]): F[Int] =
  fa.map(_ * 2)

double(List(1, 2, 3))  // List(2, 4, 6)
double(Option(21))     // Some(42)`,
          },
        ],
      },
      {
        star: 'cats-effect',
        title: 'IO, standardised',
        body: 'Typelevel’s Cats Effect (2017) turned IO into a shared contract: a data type plus type classes like Sync and Async, so libraries such as http4s and fs2 could run on any compatible effect. Version 3 rebuilt the runtime around fibers, lightweight threads that the runtime schedules itself.',
        snippets: [
          {
            label: 'Cats Effect 3',
            source: `import cats.effect.{IO, IOApp}

object Main extends IOApp.Simple {
  def run: IO[Unit] =
    IO.println("What is your name?") >>
      IO.readLine.flatMap(name => IO.println(s"Hello, $name"))
}`,
          },
        ],
      },
      {
        star: 'zio',
        title: 'Three type parameters',
        body: 'ZIO, split out of Scalaz in 2018, made the type say everything: ZIO[R, E, A] needs an environment R, may fail with an error E, and succeeds with an A. Failures became part of the signature, layers wired up dependencies, and fibers, STM and interruption came built in.',
        snippets: [
          {
            label: 'ZIO 2, a for-comprehension',
            source: `val greet: ZIO[Any, IOException, Unit] =
  for {
    name <- Console.readLine("Name? ")
    _    <- Console.printLine(s"Hello, $name")
  } yield ()`,
          },
        ],
      },
      {
        star: 'fp-ts',
        title: 'Meanwhile, in TypeScript',
        body: 'TypeScript cannot express higher-kinded types directly, so Giulio Canti’s fp-ts (2017) simulated them and built Haskell’s hierarchy on top: Option, Either, Task, and pipe to chain them together. It showed typed FP could work in the language front-end developers already used.',
        snippets: [
          {
            label: 'fp-ts',
            source: `import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

const port = pipe(
  O.fromNullable(process.env.PORT),
  O.map(Number),
  O.getOrElse(() => 3000),
)`,
          },
        ],
      },
      {
        star: 'effect',
        title: 'Effect<A, E, R>',
        body: 'Michael Arnaldi’s Effect began by bringing ZIO’s model to TypeScript, then grew its own ecosystem, joined by Canti from fp-ts. Effect<A, E, R> is ZIO’s three channels reordered, success first. Generators supply the missing do-notation: yield* plays the part of Haskell’s <-, so effectful code reads top to bottom.',
        snippets: [
          {
            label: 'Effect: the Haskell program again',
            source: `import { Effect } from 'effect'
import { readFile } from 'node:fs/promises'

const main = Effect.gen(function* () {
  const contents = yield* Effect.tryPromise(() => readFile('notes.txt', 'utf8'))
  const n = contents.split('\\n').length
  yield* Effect.log('lines:', n)
})`,
          },
          {
            label: 'ZIO[R, E, A] becomes Effect<A, E, R>',
            source: `// Scala:      def findUser(id: Long): ZIO[UserRepo, NotFound, User]
// TypeScript:
declare const findUser: (
  id: number,
) => Effect.Effect<User, NotFound, UserRepo>`,
          },
        ],
      },
      {
        star: 'foldkit',
        title: 'You are here',
        body: 'Foldkit runs Elm’s architecture on Effect v4: the model is described by a Schema, update is a pure function returning the next model and any commands, and commands are Effects the runtime executes. This page is one. Every star on this tour has a hand in the button you just clicked.',
        snippets: [
          {
            label: 'Foldkit',
            source: `const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
    ClickedDecrement: () => ({
      model: modifyFields(model, { count: count => count - 1 }),
    }),
  })`,
          },
        ],
      },
    ],
  },
  {
    id: 'async',
    title: 'async/await is a monad in disguise',
    question: 'Where did async and await come from?',
    steps: [
      {
        star: 'moggi',
        title: 'Sequencing, as a structure',
        body: 'Waiting for a result and then carrying on is a sequencing problem, and Moggi’s monads describe sequencing in general: run this, then feed its result to the rest. Hold on to the phrase “the rest of the computation”. Every step of this tour is a new way of writing it down.',
        snippets: [],
      },
      {
        star: 'haskell',
        title: 'do-notation hides the callbacks',
        body: 'In Haskell, >>= takes a computation and a callback for the rest. Nest enough of them and you get a pyramid of callbacks, so Haskell has do-notation, which reads like straight-line code and desugars into binds. async/await is this same trick, specialised to waiting.',
        snippets: [
          {
            label: 'Haskell, sugared',
            source: `greet :: IO ()
greet = do
  name <- getLine
  putStrLn ("Hi, " ++ name)`,
          },
          {
            label: 'Haskell, desugared',
            source: `greet :: IO ()
greet = getLine >>= \\name -> putStrLn ("Hi, " ++ name)`,
          },
        ],
      },
      {
        star: 'fsharp',
        title: 'async { let! … }',
        body: 'In 2007 Don Syme gave F# async workflows, built on computation expressions, F#’s generalised do-notation. Inside async { … }, let! waits for an asynchronous result without blocking a thread, and the compiler turns the rest of the block into a continuation. It was async/await in all but keywords.',
        snippets: [
          {
            label: 'F# async workflow',
            source: `let fetchLength (url: string) = async {
    use client = new System.Net.WebClient()
    let! html = client.AsyncDownloadString(System.Uri url)
    return html.Length
}`,
          },
        ],
      },
      {
        star: 'async-await',
        title: 'C# 5 makes it mainstream',
        body: 'The C# team took F#’s design and shipped it in C# 5 (2012) as two keywords: mark a method async, then await a Task inside it. The compiler rewrites the method into a state machine, the same continuation trick. Millions of .NET developers were writing monadic code without ever hearing the word.',
        snippets: [
          {
            label: 'C# 5, 2012',
            source: `async Task<int> FetchLengthAsync(string url)
{
    var client = new HttpClient();
    string html = await client.GetStringAsync(url);
    return html.Length;
}`,
          },
        ],
      },
      {
        star: 'javascript',
        title: 'From callbacks to await',
        body: 'JavaScript went the long way round: callbacks, then Promises (standardised in ES2015), then async functions in ES2017, on the model C# had established. A Promise’s then is nearly a monadic bind, but deliberately not a lawful one, because it flattens nested promises automatically.',
        snippets: [
          {
            label: 'JavaScript, ES2017',
            source: `async function fetchLength(url) {
  const res = await fetch(url)
  const html = await res.text()
  return html.length
}`,
          },
        ],
      },
      {
        star: 'python',
        title: 'Python adopts the keywords',
        body: 'Python had been building coroutines out of generators since version 2.5. PEP 492, in Python 3.5 (2015), gave them dedicated async def and await syntax, citing C# among the languages that already had it. Generators and await share one engine: both mean “pause here, resume later”.',
        snippets: [
          {
            label: 'Python 3.7+',
            source: `import asyncio

async def slow_double(x):
    await asyncio.sleep(1)
    return x * 2

print(asyncio.run(slow_double(21)))  # 42`,
          },
        ],
      },
      {
        star: 'rust',
        title: 'Futures that do nothing until asked',
        body: 'Rust stabilised async/await in 2019 with a twist: an async fn compiles to a state machine that does nothing until it is polled, so futures are lazy and need neither a garbage collector nor a built-in runtime. The ? operator beside it is another monad in disguise, short-circuiting on errors.',
        snippets: [
          {
            label: 'Rust, with the reqwest crate',
            source: `async fn fetch_length(url: &str) -> Result<usize, reqwest::Error> {
    let body = reqwest::get(url).await?.text().await?;
    Ok(body.len())
}`,
          },
        ],
      },
      {
        star: 'effect',
        title: 'Generalise it again',
        body: 'async/await knows about only one effect: waiting. Effect.gen uses the same shape, generators and yield*, for any effect, so the type records how each step can fail and what services it needs, and the whole program can be retried, raced or interrupted. It is do-notation back in full, in TypeScript.',
        snippets: [
          {
            label: 'Effect',
            source: `const fetchLength = (url: string) =>
  Effect.gen(function* () {
    const res = yield* Effect.tryPromise(() => fetch(url))
    const html = yield* Effect.tryPromise(() => res.text())
    return html.length
  })
// nothing runs until you run it, and it can be interrupted`,
          },
        ],
      },
    ],
  },
  {
    id: 'lisp-ai',
    title: 'Lisp and the dream of AI',
    question:
      'Why was Lisp the language of artificial intelligence, and what replaced it?',
    steps: [
      {
        star: 'field-logic',
        title: 'What can a machine decide?',
        body: 'In 1928 Hilbert asked whether a mechanical procedure could decide every statement of logic. The answer, in 1936, was no, but giving it meant defining computation itself. Before there were computers, logicians had already invented two ways to describe them.',
        snippets: [],
      },
      {
        star: 'lambda-calculus',
        title: 'A calculus of functions',
        body: 'Church’s way used nothing but functions: λx. x + 1 is a function, and applying it is substitution. Turing’s machines won the hardware. Church’s notation would turn up twenty years later in Lisp, borrowed by McCarthy, who admitted he had not read far enough to use the rest.',
        snippets: [],
      },
      {
        star: 'field-ai',
        title: 'Thinking as symbol manipulation',
        body: 'At Dartmouth in 1956, McCarthy, Minsky, Newell, Simon and others bet that intelligence was the manipulation of symbols. Newell, Shaw and Simon brought the Logic Theorist, written in IPL, the first list-processing language, which proved theorems from Principia Mathematica. AI needed languages for lists, trees and search.',
        snippets: [],
      },
      {
        star: 'lisp',
        title: 'Code is a list',
        body: 'McCarthy’s Lisp (1958) made the list its universal data structure and wrote programs as lists too, so a program could build and run other programs. Lists needed their memory reclaimed automatically, so McCarthy invented garbage collection. For three decades Lisp was the language of AI research.',
        snippets: [
          {
            label: 'Common Lisp',
            source: `(defun factorial (n)
  (if (zerop n)
      1
      (* n (factorial (1- n)))))`,
          },
          {
            label: 'Code is data',
            source: `(defparameter *expr* '(+ 1 (* 2 3)))

(first *expr*)  ; => +
(eval *expr*)   ; => 7`,
          },
        ],
      },
      {
        star: 'macsyma',
        title: 'Algebra by machine',
        body: 'Programs like MIT’s Macsyma (1968) did calculus symbolically, integrating and simplifying expressions represented as Lisp lists. They were among the largest programs of their era and pushed MacLisp to do fast arithmetic. Symbolic algebra was AI then; now it hides inside every computer algebra system.',
        snippets: [
          {
            label: 'Common Lisp: symbolic differentiation',
            source: `(defun deriv (e)  ; d/dx of e
  (cond ((eq e 'x) 1)
        ((atom e) 0)
        ((eq (first e) '+)
         (list '+ (deriv (second e)) (deriv (third e))))
        ((eq (first e) '*)
         (list '+ (list '* (second e) (deriv (third e)))
                  (list '* (deriv (second e)) (third e))))))`,
          },
        ],
      },
      {
        star: 'lisp-machines',
        title: 'Hardware for Lisp, then winter',
        body: 'By 1980 MIT’s AI Lab had built machines whose hardware ran Lisp, sold by Symbolics and LMI, and Common Lisp (1984) soon unified the dialects. Then expert systems overpromised, cheap Unix workstations caught up, and the AI winter of the late 1980s took the Lisp companies down with it.',
        snippets: [],
      },
      {
        star: 'python',
        title: 'A new kind of AI picks a new language',
        body: 'When AI returned it was statistical, learning from data instead of encoding rules, and its researchers chose Python. Python had quietly collected Lisp’s lambda, map and filter and Haskell’s comprehensions, and NumPy gave it fast arrays. The language of AI went from S-expressions to notebooks.',
        snippets: [
          {
            label: 'Lisp',
            source: `(mapcar (lambda (x) (* x x)) '(1 2 3))  ; => (1 4 9)`,
          },
          {
            label: 'Python',
            source: `[x * x for x in [1, 2, 3]]  # => [1, 4, 9]`,
          },
        ],
      },
      {
        star: 'jax',
        title: 'Functions that return functions, at scale',
        body: 'JAX (2018) shows how functional modern machine learning has become. grad takes a function and returns its derivative, another function; vmap and jit transform functions too. It only works if the functions are pure, so even random numbers are passed in explicitly as keys.',
        snippets: [
          {
            label: 'JAX',
            source: `import jax
import jax.numpy as jnp

def loss(w):
    return jnp.sum((w * 2.0 - 1.0) ** 2)

grad_loss = jax.grad(loss)  # a function in, a function out
print(grad_loss(jnp.array([0.0, 1.0])))`,
          },
        ],
      },
      {
        star: 'alphaproof',
        title: 'The symbolic dream returns',
        body: 'In 2024 DeepMind’s AlphaProof reached silver-medal standard at the International Mathematical Olympiad by searching for proofs in Lean, a functional language and proof assistant, with a neural network steering the search. The learned model proposes; Lean’s type checker disposes. The Logic Theorist’s ambition, sixty-eight years on.',
        snippets: [
          {
            label: 'Lean 4: every candidate proof must pass the checker',
            source: `theorem two_mul' (n : Nat) : 2 * n = n + n := by
  omega`,
          },
        ],
      },
    ],
  },
  {
    id: 'clos',
    title: 'When Lisp learned objects',
    question: 'Does Lisp have objects? (Yes, and a very unusual kind.)',
    steps: [
      {
        star: 'lisp',
        title: 'Lisp, before objects',
        body: 'Lisp began with functions and lists, not objects. But in a language where code is data, almost any feature can be added as a library, and Lisp programmers spent the 1970s doing just that. The open question was what objects should look like when they arrived.',
        snippets: [],
      },
      {
        star: 'smalltalk',
        title: 'Objects as messages',
        body: 'At Xerox PARC, Smalltalk made everything an object and every operation a message send, with a live environment and garbage collection underneath; Kay credits Lisp’s eval as a model. Its picture of an object that owns its methods is the one most languages kept.',
        snippets: [
          {
            label: 'Smalltalk-80',
            source: `3 + 4.                          "a message send: + sent to 3"
#(1 2 3) collect: [:x | x * x].   "a block is a function"
#(3 1 2) asSortedCollection.`,
          },
        ],
      },
      {
        star: 'flavors',
        title: 'Mixins on the Lisp Machine',
        body: 'Howard Cannon’s Flavors (1979) brought Smalltalk-style objects to the MIT Lisp Machine, with multiple inheritance and small add-on classes called mixins, named after an ice-cream shop that mixed sweets into a base flavour. Methods could be combined, with extra code running before or after the main one.',
        snippets: [],
      },
      {
        star: 'clos',
        title: 'Generic functions turn methods inside out',
        body: 'CLOS (1988) moved methods out of classes and into generic functions, choosing a method by the classes of all its arguments. :before, :after and :around methods wrap behaviour without editing it. Alongside it, Common Lisp’s condition system lets a handler resume failed code through a restart, an early sketch of today’s effect handlers.',
        snippets: [
          {
            label: 'CLOS: dispatch on both arguments',
            source: `(defclass asteroid () ())
(defclass ship () ())
(defgeneric collide (a b))
(defmethod collide ((a asteroid) (b ship))
  (format t "ship destroyed~%"))
(defmethod collide :before ((a asteroid) b)
  (format t "boom! "))`,
          },
        ],
      },
      {
        star: 'aspectj',
        title: 'From method combination to aspects',
        body: 'CLOS’s metaobject protocol let you reprogram the object system itself, and Gregor Kiczales, one of its designers, generalised before, after and around methods into aspect-oriented programming. AspectJ (2001) applies advice across many Java methods at once; Spring still uses its pointcut language for transactions and logging.',
        snippets: [
          {
            label: 'AspectJ, annotation style',
            source: `@Aspect
public class Timing {
  @Around("execution(* com.example.service.*.*(..))")
  public Object time(ProceedingJoinPoint jp) throws Throwable {
    long start = System.nanoTime();
    try { return jp.proceed(); }
    finally { System.out.println(System.nanoTime() - start); }
  }
}`,
          },
        ],
      },
      {
        star: 'dylan',
        title: 'CLOS, slimmed down',
        body: 'Apple’s Dylan kept CLOS’s generic functions in a leaner language. Apple dropped it, but its designers’ 1996 paper settled an old multiple-inheritance puzzle, the order in which superclasses are searched. Their C3 linearization is monotonic: a class never contradicts the order its parents chose.',
        snippets: [],
      },
      {
        star: 'python',
        title: 'C3 in your Python',
        body: 'Python 2.3 (2003) adopted Dylan’s C3 algorithm for its classes, and Raku and Solidity use it too. Every time super() finds the next method in a diamond of classes, it follows a list computed by an algorithm from a Lisp dialect.',
        snippets: [
          {
            label: 'Python',
            source: `class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass

print([k.__name__ for k in D.__mro__])
# ['D', 'B', 'C', 'A', 'object']`,
          },
        ],
      },
      {
        star: 'julia',
        title: 'Multiple dispatch for everything',
        body: 'Julia (2012) made the CLOS model the core of a fast scientific language: every function is generic, methods are chosen by the types of all arguments, and each combination is compiled separately. Packages extend each other’s functions without coordinating, the kind of extensibility CLOS’s designers argued for.',
        snippets: [
          {
            label: 'Julia: the same collision',
            source: `abstract type Body end
struct Asteroid <: Body end
struct Ship <: Body end

collide(a::Asteroid, b::Ship) = println("ship destroyed")
collide(a::Ship, b::Asteroid) = collide(b, a)
collide(a::Body, b::Body) = println("they bounce")`,
          },
        ],
      },
    ],
  },
  {
    id: 'ml-types',
    title: 'Types that think for you',
    question:
      'Where did Rust enums, Swift optionals and TypeScript unions come from?',
    steps: [
      {
        star: 'hindley-milner',
        title: 'Types without writing them',
        body: 'Hindley (1969) and Milner (1978) showed that every expression in a simple functional language has a most general type, and that a compiler can find it. You write the code; the types come back to you as a report.',
        snippets: [
          {
            label: 'OCaml infers the most general type',
            source: `let compose f g x = f (g x)
(* val compose : ('a -> 'b) -> ('c -> 'a) -> 'c -> 'b *)`,
          },
        ],
      },
      {
        star: 'lcf',
        title: 'A language for proofs',
        body: 'Milner needed a language to script his LCF theorem prover, one in which a theorem could not be forged. The answer was ML, with theorem as an abstract type whose values only the rules of inference can create. From the start, type safety was a matter of logical soundness.',
        snippets: [],
      },
      {
        star: 'ml',
        title: 'ML escapes',
        body: 'ML combined Hindley–Milner inference with exceptions and references, and soon outgrew LCF to become a general-purpose language. Standard ML (1983–90) was specified so carefully that its type safety could be proved. Programs needed almost no annotations, and the compiler still caught whole classes of mistakes.',
        snippets: [
          {
            label: 'Standard ML',
            source: `datatype shape = Circle of real | Rect of real * real

fun area (Circle r) = 3.14159 * r * r
  | area (Rect (w, h)) = w * h`,
          },
        ],
      },
      {
        star: 'hope',
        title: 'Data types meet pattern matching',
        body: 'Hope (1980), from Edinburgh, paired user-defined algebraic data types with pattern-matching equations, and Standard ML adopted both. Declare the shapes your data can take, then write one equation per shape. That is the idea that now appears in Rust, Swift, TypeScript and Java.',
        snippets: [
          {
            label: 'Hope, 1980',
            source: `data tree == empty ++ node(tree # num # tree);
dec sum : tree -> num;
--- sum(empty) <= 0;
--- sum(node(l, n, r)) <= sum(l) + n + sum(r);`,
          },
        ],
      },
      {
        star: 'ocaml',
        title: 'The pragmatic branch',
        body: 'OCaml (1996) kept ML’s inference and variants, added objects and a fast native compiler, and became a favourite language for writing compilers. Rust’s first compiler, Facebook’s Flow and Hack checkers and the Rocq prover were all written in it. Forget a case and the compiler tells you which.',
        snippets: [
          {
            label: 'OCaml warns about the missing case',
            source: `type shape = Circle of float | Rect of float * float | Triangle of float * float

let area = function
  | Circle r -> Float.pi *. r *. r
  | Rect (w, h) -> w *. h
(* Warning 8: this pattern-matching is not exhaustive.
   Here is an example of a case that is not matched: Triangle (_, _) *)`,
          },
        ],
      },
      {
        star: 'haskell',
        title: 'Type classes',
        body: 'Haskell added a missing piece: type classes, which overload functions like == and show without giving up inference. A type can say “works for any a that has an area”, and the compiler finds the right implementation. Rust traits, Swift protocols and Scala givens all descend from or rhyme with this.',
        snippets: [
          {
            label: 'Haskell',
            source: `class Shape a where
  area :: a -> Double

newtype Square = Square Double

instance Shape Square where
  area (Square s) = s * s`,
          },
        ],
      },
      {
        star: 'rust',
        title: 'ML in systems clothing',
        body: 'Rust’s first compiler was written in OCaml, and it shows: enums that carry data, exhaustive match, type inference within functions, and traits after Haskell’s type classes. Option and Result replaced null and exceptions for a generation of systems programmers.',
        snippets: [
          {
            label: 'Rust',
            source: `enum Shape { Circle(f64), Rect(f64, f64) }

fn area(s: &Shape) -> f64 {
    match s {
        Shape::Circle(r) => std::f64::consts::PI * r * r,
        Shape::Rect(w, h) => w * h,
    }
}`,
          },
        ],
      },
      {
        star: 'typescript',
        title: 'Discriminated unions',
        body: 'TypeScript 2.0 (2016) let JavaScript developers write algebraic data types as unions of object types sharing a literal tag. Switch on the tag and the compiler narrows the type in each branch; leave a case out and the function no longer returns a number on every path, so it fails to compile.',
        snippets: [
          {
            label: 'TypeScript',
            source: `type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'rect'; w: number; h: number }

const area = (s: Shape): number => {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2
    case 'rect': return s.w * s.h
  }
}`,
          },
        ],
      },
      {
        star: 'java',
        title: 'Even Java',
        body: 'Java 21 (2023) finalised pattern matching for switch and record patterns, building on the sealed interfaces of Java 17. Philip Wadler had helped bring generics to Java in 2004; algebraic data types followed nearly two decades later.',
        snippets: [
          {
            label: 'Java 21',
            source: `sealed interface Shape permits Circle, Rect {}
record Circle(double r) implements Shape {}
record Rect(double w, double h) implements Shape {}

static double area(Shape s) {
    return switch (s) {
        case Circle c -> Math.PI * c.r() * c.r();
        case Rect(double w, double h) -> w * h;
    };
}`,
          },
        ],
      },
    ],
  },
  {
    id: 'react-elm',
    title: 'Your React app is an Elm program in disguise',
    question: 'Where did reducers, one-way data flow and signals come from?',
    steps: [
      {
        star: 'visicalc',
        title: 'The first reactive program most people used',
        body: 'In a spreadsheet you never tell a cell to update: you state how it depends on other cells, and VisiCalc (1979) kept everything consistent. That is reactive programming, and spreadsheets have taught it to more people than any language. Excel’s LAMBDA (2020) finally let those formulas define functions.',
        snippets: [
          {
            label: 'Excel, 2020',
            source: `=LAMBDA(r, PI() * r ^ 2)(A2)`,
          },
        ],
      },
      {
        star: 'fran',
        title: 'Values over time',
        body: 'Conal Elliott and Paul Hudak’s Fran (1997) made time-varying values first-class in Haskell: a behaviour is a value that changes with time, and you can add, scale and combine behaviours. It named functional reactive programming and began the line of research Elm would carry into the browser.',
        snippets: [
          {
            label: 'Fran, 1997',
            source: `-- a behaviour: a value that varies with time
wiggle :: RealB
wiggle = sin (pi * time)`,
          },
        ],
      },
      {
        star: 'elm',
        title: 'From signals to an architecture',
        body: 'Evan Czaplicki’s Elm (2012) began as FRP for the browser. In 2016 he dropped signals for something simpler: one model, messages describing what happened, a pure update computing the next model, and a view. The Elm Architecture turned out to be the idea everyone copied.',
        snippets: [
          {
            label: 'Elm',
            source: `type Msg = Increment | Decrement

update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment -> model + 1
        Decrement -> model - 1`,
          },
        ],
      },
      {
        star: 'react',
        title: 'A React prototype in Standard ML',
        body: 'Jordan Walke built React at Facebook, open-sourced in 2013, around one idea: the UI is a function of state, recomputed and diffed. Reason’s documentation records that his earliest React prototypes were written in Standard ML. React made pure render functions ordinary front-end practice.',
        snippets: [
          {
            label: 'React',
            source: `function Greeting({ name }) {
  return <h1>Hello, {name}</h1>
}`,
          },
        ],
      },
      {
        star: 'redux',
        title: 'Elm’s update, in JavaScript',
        body: 'Dan Abramov wrote Redux in 2015 to demonstrate time-travel debugging, which only works if every state change goes through a pure function. Its documentation credits Elm, and a reducer is Elm’s update with the arguments swapped. Compare it with the Elm snippet two steps back.',
        snippets: [
          {
            label: 'Redux',
            source: `function counter(state = 0, action) {
  switch (action.type) {
    case 'increment': return state + 1
    case 'decrement': return state - 1
    default: return state
  }
}`,
          },
        ],
      },
      {
        star: 'react-hooks',
        title: 'Effects, as a mental model',
        body: 'Hooks (2018) moved state into plain functions: useState, useReducer, useEffect. Their RFC lists algebraic effects among its sources, and Dan Abramov explained hooks through them: a component asks for state and React, like a handler further up, supplies it. JavaScript has no real effect handlers, so React tracks hooks by the order they are called.',
        snippets: [
          {
            label: 'React, with the Redux reducer',
            source: `function Counter() {
  const [count, dispatch] = useReducer(counter, 0)
  return (
    <button onClick={() => dispatch({ type: 'increment' })}>{count}</button>
  )
}`,
          },
        ],
      },
      {
        star: 'signals',
        title: 'Back to the spreadsheet',
        body: 'Signals, popularised by SolidJS in 2021 and since adopted by Preact and Angular, skip the re-render: each value tracks who reads it and updates only those readers. It is VisiCalc’s dependency graph applied to the DOM, and a TC39 proposal aims to put it into the language.',
        snippets: [
          {
            label: 'SolidJS',
            source: `const [count, setCount] = createSignal(0)
const doubled = () => count() * 2

createEffect(() => console.log(doubled()))  // logs 0
setCount(5)                                  // logs 10`,
          },
        ],
      },
      {
        star: 'foldkit',
        title: 'This page',
        body: 'Foldkit runs The Elm Architecture on Effect. Everything you do here is a message, update computes the next model, and the galaxy is drawn from that model. Following this tour has moved you through the very loop it describes.',
        snippets: [
          {
            label: 'Foldkit',
            source: `const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
  })`,
          },
        ],
      },
    ],
  },
  {
    id: 'let-it-crash',
    title: 'Let it crash',
    question: 'Why do Erlang programmers let processes fail on purpose?',
    steps: [
      {
        star: 'actor-model',
        title: 'Everything is an actor',
        body: 'In 1973 Carl Hewitt proposed a model of computation with no shared memory at all: actors receive messages, send messages, create new actors and decide how to handle the next message. It grew out of AI research on his Planner language, and it was meant to scale across many machines.',
        snippets: [],
      },
      {
        star: 'scheme',
        title: 'Actors are closures',
        body: 'Sussman and Steele wrote Scheme in 1975 to understand Hewitt’s actors. Building the interpreter, they found that the code to create an actor was the same as the code to create a closure, a function that remembers its environment. Sending a message and calling a function were the same mechanism.',
        snippets: [
          {
            label: 'Scheme: an actor is a closure that takes messages',
            source: `(define (make-counter)
  (let ((count 0))
    (lambda (message)
      (case message
        ((inc) (set! count (+ count 1)) count)
        ((get) count)))))`,
          },
        ],
      },
      {
        star: 'prolog',
        title: 'An unlikely parent',
        body: 'Erlang’s syntax comes from somewhere surprising: Prolog, the logic language from Marseille. Joe Armstrong wrote the first Erlang interpreter in Prolog in 1986, which is why Erlang has clauses, pattern matching, full stops and capitalised variables.',
        snippets: [
          {
            label: 'Prolog',
            source: `parent(tom, bob).
parent(bob, ann).
grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

% ?- grandparent(tom, Who).
% Who = ann.`,
          },
        ],
      },
      {
        star: 'field-telecom',
        title: 'Switches that never stop',
        body: 'Ericsson’s problem was a telephone exchange: thousands of simultaneous calls, upgrades without downtime, hardware that fails. Defensive code everywhere made software fragile. The answer of Ericsson’s Computer Science Lab was to isolate everything and treat a crash as normal, provided something notices and recovers.',
        snippets: [],
      },
      {
        star: 'erlang',
        title: 'Processes, messages, links',
        body: 'Erlang (1986) gives you huge numbers of cheap processes that share nothing and communicate only by messages. Link two processes and if one dies, the other is told. Armstrong said they arrived at this design without knowing Hewitt’s actors: history rhyming rather than repeating.',
        snippets: [
          {
            label: 'Erlang',
            source: `loop(Count) ->
    receive
        {add, N}    -> loop(Count + N);
        {get, From} -> From ! {count, Count}, loop(Count)
    end.

%% in the shell:
%% Pid = spawn(fun() -> counter:loop(0) end).`,
          },
        ],
      },
      {
        star: 'otp',
        title: 'Supervision trees',
        body: 'OTP (1996) turned the pattern into libraries. A supervisor watches workers and restarts them according to a strategy such as one_for_one, and supervisors watch supervisors. You write the happy path and let the tree handle failure. That is “let it crash”: not carelessness, but recovery by design.',
        snippets: [
          {
            label: 'An OTP supervisor',
            source: `init([]) ->
    SupFlags = #{strategy => one_for_one, intensity => 5, period => 10},
    Child = #{id => counter, start => {counter, start_link, []}},
    {ok, {SupFlags, [Child]}}.`,
          },
        ],
      },
      {
        star: 'akka',
        title: 'The JVM learns to let it crash',
        body: 'Jonas Bonér’s Akka (2009) brought Erlang’s actors and supervision hierarchies to Scala and Java, and they spread from telecom to banking and streaming. Its 2022 move to a source-available licence produced Apache Pekko, an open-source fork.',
        snippets: [
          {
            label: 'Akka classic actor, Scala',
            source: `class Counter extends Actor {
  var count = 0
  def receive = {
    case "inc" => count += 1
    case "get" => sender() ! count
  }
}`,
          },
        ],
      },
      {
        star: 'elixir',
        title: 'The BEAM, rediscovered',
        body: 'José Valim’s Elixir (2012) gave the Erlang VM Ruby-like syntax, macros and excellent tooling while using OTP unchanged. A generation of web developers met supervision trees through Elixir’s Phoenix framework.',
        snippets: [
          {
            label: 'Elixir',
            source: `children = [
  {Counter, 0},
  {Registry, keys: :unique, name: MyApp.Registry}
]

Supervisor.start_link(children, strategy: :one_for_one)`,
          },
        ],
      },
      {
        star: 'gleam',
        title: 'Types on the BEAM',
        body: 'Gleam (1.0 in 2024) adds what Erlang never had: a static type system in the ML tradition, with inferred types and exhaustive case expressions. Errors you expect become Result values; the crashes you don’t expect are still caught by supervisors. Let it crash, but only for the unexpected.',
        snippets: [
          {
            label: 'Gleam',
            source: `import gleam/int

pub fn describe(result: Result(Int, String)) -> String {
  case result {
    Ok(n) -> "got " <> int.to_string(n)
    Error(reason) -> "failed: " <> reason
  }
}`,
          },
        ],
      },
    ],
  },
  {
    id: 'proofs',
    title: 'Proofs are programs',
    question: 'How did type checkers become proof checkers?',
    steps: [
      {
        star: 'field-proof',
        title: 'A proof is a construction',
        body: 'Intuitionists such as Brouwer and Heyting insisted that to prove something exists, you must show how to build it. On that reading, a proof that A implies B is a method that turns any proof of A into a proof of B. A method is a function, though nobody put it that way yet.',
        snippets: [],
      },
      {
        star: 'curry-howard',
        title: 'Propositions are types',
        body: 'Curry noticed in the 1930s, and Howard made precise in 1969, that this is literally true: a proposition is a type, a proof is a program of that type, and simplifying a proof is running the program. A function that swaps a pair is a proof that A and B implies B and A.',
        snippets: [
          {
            label: 'Haskell: a program that is also a proof',
            source: `-- (a, b) -> (b, a) reads: A and B implies B and A
swap :: (a, b) -> (b, a)
swap (x, y) = (y, x)`,
          },
        ],
      },
      {
        star: 'automath',
        title: 'Checking mathematics by machine',
        body: 'While Howard’s manuscript was still circulating privately, N. G. de Bruijn was already checking proofs by computer in Automath (1967), writing them as typed λ-terms. In 1977 his student Bert Jutting checked an entire analysis textbook with it. Proof checking had become type checking.',
        snippets: [],
      },
      {
        star: 'martin-lof',
        title: 'Types that depend on values',
        body: 'Per Martin-Löf’s type theory (from 1972) let types mention values, so “a list of length n” is a type and “for every n” is a function type. That made the correspondence strong enough for real mathematics. His first version was inconsistent; the repair, a hierarchy of universes, survives in every dependently typed language.',
        snippets: [],
      },
      {
        star: 'lcf',
        title: 'Trust a small kernel',
        body: 'Milner’s LCF took another path: hide proofs entirely and make theorem an abstract type that only the rules of inference can produce. The language he built for this was ML. Isabelle and the HOL family of provers still follow the LCF approach.',
        snippets: [
          {
            label: 'The LCF idea, sketched in Standard ML',
            source: `signature KERNEL = sig
  type term
  type thm                          (* only the kernel can make one *)
  val assume : term -> thm
  val mp     : thm -> thm -> thm    (* modus ponens *)
end`,
          },
        ],
      },
      {
        star: 'coq',
        title: 'Proofs and programs, one language',
        body: 'Coquand and Huet’s Coq (first released 1989, renamed Rocq in 2025) put proofs and programs in one language, the Calculus of Inductive Constructions. It checked the four colour theorem and CompCert, a C compiler proved to preserve your program’s meaning, and it can extract proved programs to OCaml.',
        snippets: [
          {
            label: 'Coq: the same fact, proved interactively',
            source: `Theorem and_swap : forall P Q : Prop, P /\\ Q -> Q /\\ P.
Proof.
  intros P Q [HP HQ].
  split; assumption.
Qed.`,
          },
        ],
      },
      {
        star: 'idris',
        title: 'Dependent types for programmers',
        body: 'Agda and Idris made dependent types feel like programming. In Idris a vector carries its length in its type, so appending two vectors provably yields one whose length is the sum, and taking the head of an empty vector simply does not type-check.',
        snippets: [
          {
            label: 'Idris',
            source: `data Vect : Nat -> Type -> Type where
  Nil  : Vect Z a
  (::) : a -> Vect k a -> Vect (S k) a

append : Vect n a -> Vect m a -> Vect (n + m) a
append Nil       ys = ys
append (x :: xs) ys = x :: append xs ys`,
          },
        ],
      },
      {
        star: 'lean',
        title: 'For mathematicians and programmers',
        body: 'Lean, begun by Leonardo de Moura in 2013, is a proof assistant and, since Lean 4, a fast functional language with Haskell-style do-notation. Its library Mathlib has drawn hundreds of contributors formalising mathematics. A proof by rfl is a program the type checker evaluates; a proof by induction is a recursive function.',
        snippets: [
          {
            label: 'Lean 4',
            source: `theorem add_zero' (n : Nat) : n + 0 = n := rfl

theorem zero_add' : ∀ n : Nat, 0 + n = n
  | 0     => rfl
  | n + 1 => congrArg Nat.succ (zero_add' n)`,
          },
        ],
      },
      {
        star: 'alphaproof',
        title: 'Machines that search, kernels that check',
        body: 'AlphaProof (2024) trains a neural network to propose Lean proofs and lets Lean’s kernel check every one, reaching silver-medal standard at the International Mathematical Olympiad. The learned part can be wrong; the kernel accepts only valid proofs. Curry–Howard is what makes that division of labour possible.',
        snippets: [],
      },
    ],
  },
  {
    id: 'javascript',
    title: 'How JavaScript learned FP',
    question: 'How did functional ideas sneak into the browser?',
    steps: [
      {
        star: 'scheme',
        title: 'The language that was meant to be',
        body: 'In 1995 Netscape recruited Brendan Eich with the promise of putting Scheme in the browser. Management then wanted something that looked like Java. Scheme’s ideas got in anyway, under the braces.',
        snippets: [
          {
            label: 'Scheme',
            source: `(define (adder n)
  (lambda (x) (+ x n)))

((adder 10) 5)  ; => 15`,
          },
        ],
      },
      {
        star: 'javascript',
        title: 'Closures under the braces',
        body: 'JavaScript 1.0 shipped with first-class functions. Self-style prototypes followed in 1996, and in 1997 JavaScript 1.2 added nested functions and function expressions, turning functions into lexical closures, the heart of Scheme. For years most developers used them for event handlers and little else, but the functional core was in every browser.',
        snippets: [
          {
            label: 'JavaScript 1.2, 1997',
            source: `function adder(n) {
  return function (x) { return x + n }
}

adder(10)(5)  // 15`,
          },
        ],
      },
      {
        star: 'underscore',
        title: 'A utility belt',
        body: 'Underscore (2009) gave everyday JavaScript map, filter, reduce, compose, memoize and debounce, working in every browser before ES5’s array methods were universal. Lodash forked it in 2012 for speed and consistency and became one of npm’s most depended-upon packages. Functional idioms became normal JavaScript.',
        snippets: [
          {
            label: 'Underscore, 2009',
            source: `_.map([1, 2, 3], function (n) { return n * 2 })
_.reduce([1, 2, 3], function (sum, n) { return sum + n }, 0)`,
          },
          {
            label: 'Built in, ES5 methods with ES2015 arrows',
            source: `const doubled = [1, 2, 3].map(n => n * 2)
const total = [1, 2, 3].reduce((sum, n) => sum + n, 0)`,
          },
        ],
      },
      {
        star: 'ramda',
        title: 'Data last',
        body: 'Underscore put the data first, which makes currying awkward. Ramda (2013) reversed the order: every function is curried and takes its data last, so you can compose a pipeline before you have anything to run it on. Lodash later added lodash/fp in the same style.',
        snippets: [
          {
            label: 'Ramda',
            source: `import * as R from 'ramda'

const isEven = n => n % 2 === 0
const sumOfEvenSquares = R.pipe(R.filter(isEven), R.map(n => n * n), R.sum)

sumOfEvenSquares([1, 2, 3, 4])  // 20`,
          },
        ],
      },
      {
        star: 'fantasy-land',
        title: 'A specification for monads',
        body: 'In 2013 a long Promises/A+ thread argued about making then a lawful monadic bind, and the idea was dismissed as typed-language fantasy. Brian McKenna answered with Fantasy Land: a specification of Functor, Monad and friends, laws included, for any JavaScript library that wanted to interoperate.',
        snippets: [
          {
            label: 'A Fantasy Land Maybe (method names prefixed since 1.0)',
            source: `const Just = value => ({
  'fantasy-land/map': f => Just(f(value)),
  'fantasy-land/chain': f => f(value),
})
const Nothing = {
  'fantasy-land/map': () => Nothing,
  'fantasy-land/chain': () => Nothing,
}`,
          },
        ],
      },
      {
        star: 'sanctuary',
        title: 'Haskell’s discipline, in JavaScript',
        body: 'Folktale packaged Maybe, Either and Task as Fantasy Land types, and Brian Lonsdorf’s Mostly Adequate Guide taught a generation what to do with them. Sanctuary (2015) went further: functions that never return null or throw, with Haskell-style signatures checked at run time.',
        snippets: [
          {
            label: 'Sanctuary',
            source: `import S from 'sanctuary'

S.head([])                    // Nothing
S.head([1, 2, 3])             // Just (1)
S.map(S.add(1))(S.Just(41))   // Just (42)`,
          },
        ],
      },
      {
        star: 'fluture',
        title: 'A Promise that waits',
        body: 'A Promise starts running the moment you create it and cannot be cancelled. Fluture’s Future (2016) is lazy, cancellable and a lawful monad: building one only describes the work, and fork runs it with separate callbacks for failure and success.',
        snippets: [
          {
            label: 'Promise: already running',
            source: `const name = fetch('/users/42')
  .then(res => res.json())
  .then(user => user.name)  // the request has already been sent
name.then(console.log, console.error)`,
          },
          {
            label: 'Fluture: nothing happens until fork',
            source: `import { encaseP, fork, map } from 'fluture'

const fetchJson = encaseP(url => fetch(url).then(res => res.json()))
const name = map(user => user.name)(fetchJson('/users/42'))  // a description
fork(console.error)(console.log)(name)                        // now it runs`,
          },
        ],
      },
      {
        star: 'fp-ts',
        title: 'Types arrive',
        body: 'TypeScript let these ideas be checked at compile time. Giulio Canti’s fp-ts (2017) simulated higher-kinded types and built Option, Either, Task and the type-class hierarchy on top, with pipe to compose them. His io-ts validated data at the edges against the same types.',
        snippets: [
          {
            label: 'fp-ts',
            source: `import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

const port = pipe(
  O.fromNullable(process.env.PORT),
  O.map(Number),
  O.getOrElse(() => 3000),
)`,
          },
        ],
      },
      {
        star: 'effect',
        title: 'Everything in one Effect',
        body: 'Effect folded these threads together: lazy and interruptible like a Fluture, typed like fp-ts, with pipe for composition and generators standing in for do-notation. Canti joined the project, and fp-ts now points to Effect as its successor.',
        snippets: [
          {
            label: 'Effect',
            source: `import { Effect } from 'effect'

const fetchJson = (url: string) =>
  Effect.tryPromise(() => fetch(url).then(res => res.json()))

const program = Effect.gen(function* () {
  const user = yield* fetchJson('/users/42')
  return user.name
})`,
          },
        ],
      },
      {
        star: 'foldkit',
        title: 'And the page you are reading',
        body: 'Foldkit builds The Elm Architecture on Effect, so this galaxy’s state, messages and commands are typed Effect code. Scheme’s closures, Underscore’s map, Fantasy Land’s laws and Effect’s types all run inside the page you are reading.',
        snippets: [],
      },
    ],
  },
]

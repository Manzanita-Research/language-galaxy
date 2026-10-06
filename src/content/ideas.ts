import type { Idea } from '../domain/idea'

// The constructs that travel along the filaments. Every link names at least
// one of these, so following an idea lights a thread through the galaxy.

export const ideas: ReadonlyArray<Idea> = [
  {
    id: 'lambda',
    name: 'First-class functions & closures',
    gloss:
      'Functions are values: pass them, return them, and let them remember the variables around them.',
    today:
      'Arrow functions in JavaScript, lambdas in Java, C++, Python and Swift.',
  },
  {
    id: 'hof',
    name: 'map, filter, reduce',
    gloss:
      'Operate on a whole collection by handing it a function, instead of writing the loop.',
    today:
      'Array.prototype.map, Java Streams, LINQ, Spark, every data pipeline.',
  },
  {
    id: 'gc',
    name: 'Garbage collection',
    gloss:
      'Memory is reclaimed automatically once nothing can reach it any more.',
    today: 'The JVM, V8, Go, .NET, Python: almost every language you use.',
  },
  {
    id: 'homoiconicity',
    name: 'Code as data & macros',
    gloss:
      'Programs are written in the same structure they manipulate, so code can write code.',
    today: 'Rust and Elixir macros, Clojure, Julia, babel plugins.',
  },
  {
    id: 'repl',
    name: 'The REPL & live programming',
    gloss:
      'Type an expression, see its value, keep the running program and change it while it runs.',
    today:
      'Python and Node prompts, Jupyter notebooks, browser devtools consoles.',
  },
  {
    id: 'continuations',
    name: 'Continuations & coroutines',
    gloss:
      'The rest of a computation becomes a value you can pause, store and resume later.',
    today: 'Generators, async/await, Kotlin coroutines, React Suspense.',
  },
  {
    id: 'inference',
    name: 'Type inference',
    gloss:
      'The compiler works out the types of your program without you writing them down.',
    today: 'let x = … in Rust, Swift, Kotlin, TypeScript and OCaml.',
  },
  {
    id: 'adts',
    name: 'Algebraic data types & pattern matching',
    gloss:
      'Define data as a closed set of shapes, then take it apart case by case with the compiler checking you missed none.',
    today:
      'Rust enums and match, Swift enums, TypeScript discriminated unions, Java sealed classes.',
  },
  {
    id: 'typeclasses',
    name: 'Type classes & traits',
    gloss:
      'Behaviour is attached to types after the fact, and the compiler finds the right implementation.',
    today: 'Rust traits, Swift protocols, Scala givens, Lean instances.',
  },
  {
    id: 'monads',
    name: 'Monads & do-notation',
    gloss:
      'Effects become ordinary values that chain, so a sequence of steps reads top to bottom.',
    today: 'Effect.gen, async/await, Promise.then, LINQ, Rust’s ? operator.',
  },
  {
    id: 'laziness',
    name: 'Lazy evaluation',
    gloss:
      'Nothing is computed until something needs it, so infinite structures are fine.',
    today: 'Iterators and generators, Java Streams, Kotlin Sequences, Nix.',
  },
  {
    id: 'purity',
    name: 'Purity & referential transparency',
    gloss:
      'Same inputs, same output, no hidden changes, so a call can be replaced by its result.',
    today: 'React render functions, Redux reducers, reproducible Nix builds.',
  },
  {
    id: 'immutability',
    name: 'Immutable & persistent data',
    gloss:
      'Values never change; an “update” shares structure with the old version.',
    today:
      'React state, Immer, Clojure, Swift value types, Git’s object store.',
  },
  {
    id: 'comprehensions',
    name: 'Comprehensions',
    gloss:
      'Build a collection by describing it the way a mathematician writes a set.',
    today: 'Python list comprehensions, Scala for, LINQ query syntax.',
  },
  {
    id: 'optionresult',
    name: 'Errors & absence as values',
    gloss:
      'A value that may be missing, or may have failed, says so in its type instead of throwing.',
    today:
      'Rust Option and Result, Swift optionals, Effect’s typed error channel.',
  },
  {
    id: 'pipelines',
    name: 'Pipelines & composition',
    gloss: 'Data flows left to right through a chain of small functions.',
    today: 'Effect’s pipe, Elixir and F# |>, Unix pipes, method chaining.',
  },
  {
    id: 'proofs',
    name: 'Proofs as programs',
    gloss:
      'A type is a proposition and a program of that type is its proof (Curry–Howard).',
    today:
      'Lean 4 and Mathlib, Rocq, verified compilers, TypeScript’s type-level tricks.',
  },
  {
    id: 'effects',
    name: 'Algebraic effects & handlers',
    gloss:
      'Code asks for an effect by name; a handler further up decides what it means and may resume.',
    today: 'OCaml 5, Koka, Unison, and the mental model behind React hooks.',
  },
  {
    id: 'fibers',
    name: 'Lightweight threads & fibers',
    gloss:
      'Thousands or millions of cheap concurrent tasks, scheduled by the runtime rather than the OS.',
    today:
      'Goroutines, Java virtual threads, Effect and ZIO fibers, BEAM processes.',
  },
  {
    id: 'actors',
    name: 'Actors & message passing',
    gloss:
      'Isolated processes that share nothing and communicate only by sending messages.',
    today: 'Erlang and Elixir, Akka, Swift actors, Orleans.',
  },
  {
    id: 'supervision',
    name: 'Supervision & “let it crash”',
    gloss:
      'Don’t defend against every failure; let the process die and have a supervisor restart it cleanly.',
    today:
      'OTP supervisors, Akka, structured concurrency in Effect, ZIO and Kotlin.',
  },
  {
    id: 'stm',
    name: 'Software transactional memory',
    gloss:
      'Shared state changes in atomic transactions that compose, instead of locks that don’t.',
    today: 'Haskell STM, Clojure refs, ZIO and Effect STM.',
  },
  {
    id: 'frp',
    name: 'Reactive values & signals',
    gloss:
      'Describe how a value depends on others over time, and let the runtime keep it up to date.',
    today: 'Spreadsheets, signals in Solid, Preact, Angular and Vue, RxJS.',
  },
  {
    id: 'tea',
    name: 'Model → update → view',
    gloss:
      'All state in one immutable model; messages describe what happened; a pure function computes the next state.',
    today: 'Redux, SwiftUI with TCA, Bubble Tea, Iced, Foldkit (this page).',
  },
  {
    id: 'dispatch',
    name: 'Generic functions & multiple dispatch',
    gloss:
      'Methods belong to functions rather than classes, chosen by the types of all the arguments.',
    today: 'Julia, Clojure multimethods, Python’s method resolution order.',
  },
  {
    id: 'objects',
    name: 'Objects, classes & mixins',
    gloss:
      'Bundle state with behaviour, and compose behaviour by inheritance or by mixing it in.',
    today: 'Classes everywhere; Ruby modules, Scala traits and Python mixins.',
  },
  {
    id: 'arrays',
    name: 'Whole-array thinking',
    gloss:
      'Operate on entire arrays at once and let the shapes line up, with no loops in sight.',
    today: 'NumPy broadcasting, JAX, PyTorch tensors, R, MATLAB.',
  },
  {
    id: 'ownership',
    name: 'Linear types & ownership',
    gloss:
      'A value may be used exactly once, or by one owner at a time, so memory and resources are tracked by the type system.',
    today: 'Rust’s borrow checker, Swift’s noncopyable types, Linear Haskell.',
  },
  {
    id: 'logic',
    name: 'Unification & search',
    gloss:
      'State facts and rules, then ask questions; the machine finds the answers by matching and backtracking.',
    today: 'Datalog in CodeQL and Datomic, type checkers, miniKanren.',
  },
  {
    id: 'testing',
    name: 'Property-based testing',
    gloss:
      'State a law your code must obey and let the machine search for a counterexample.',
    today: 'QuickCheck, Hypothesis, fast-check (inside Effect), proptest.',
  },
]

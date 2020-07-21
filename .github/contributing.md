# Contributing to Bitauth IDE

Pull requests are welcome! Here are some miscellaneous notes on the project.

# Running Bitauth IDE locally

First, clone the Bitauth IDE repo, and install its dependencies, then run `yarn start`:

```
cd bitauth-ide
yarn
yarn start
```

# link libauth

To work on `libauth` and Bitauth IDE simultaneously, you can link the `libauth` package inside this one.

Clone [libauth](https://github.com/bitauth/libauth/), then run `yarn link` from within the `libauth` directory:

```
cd libauth
yarn link
```

Then inside the `bitauth-ide`, link the `libauth` package:

```
cd bitauth-ide
yarn link libauth
```

It's recommended you use the `yarn watch:module` task within the `libauth` repo while developing.

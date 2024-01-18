[TODO: test results]

[![Codecov](https://img.shields.io/codecov/c/github/bitauth/bitauth-ide/master.svg)](https://codecov.io/gh/bitauth/bitauth-ide)
[![GitHub stars](https://img.shields.io/github/stars/bitauth/bitauth-ide.svg?style=social&logo=github&label=Stars)](https://github.com/bitauth/bitauth-ide)
[![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/BitauthIDE)](https://x.com/BitauthIDE)

# bitauth-ide

**[Bitauth IDE](https://bitauth.com/ide)** is an integrated development environment for bitcoin authentication. You can [find a full walk-through and video about it in this blog post](https://blog.bitjson.com/bitauth-ide-write-and-debug-custom-bitcoin-scripts-aad51f6e3f44).

Get help or share feedback in the [Bitauth IDE Telegram group](https://t.me/bitauth_ide).

![bitauth-ide-dark](https://user-images.githubusercontent.com/904007/53257400-021e9b80-3698-11e9-86ca-c87f3b8f0bf1.png)

### Debug Unlocking and Locking Scripts Together

![unlocking-and-locking-script](https://user-images.githubusercontent.com/904007/53257569-7eb17a00-3698-11e9-8fc8-3f55942d0325.png)

### Inspect the Evaluation in DevTools

![unlocking-and-locking-script](https://user-images.githubusercontent.com/904007/53257628-a7d20a80-3698-11e9-851a-ae17bd675de4.png)

### Create and Manage Entities and Variables

![entities-and-variables](https://user-images.githubusercontent.com/904007/53257756-eb2c7900-3698-11e9-836c-e84fa753ae4b.png)

### Describe and Document Bitauth Templates

![template-settings](https://user-images.githubusercontent.com/904007/53258105-ca185800-3699-11e9-9fe3-09ef0a937e1c.png)

### Import and Export JSON Bitauth Templates

![import-export](https://user-images.githubusercontent.com/904007/53257997-858cbc80-3699-11e9-9361-1db9a57d12e9.png)

Read more about it in [the blog post](https://blog.bitjson.com/bitauth-ide-write-and-debug-custom-bitcoin-scripts-aad51f6e3f44).

## Contributing

Pull Requests are welcome!

This application requires [Yarn](https://yarnpkg.com/) for development. If you don't have Yarn, make sure you have `Node.js` installed, then run `npm install -g yarn`. Once Yarn is installed, recursive-clone `bitauth-ide` and run the `start` package script:

```sh
# note the use of --recursive to clone submodules
git clone --recursive https://github.com/bitauth/bitauth-ide.git
cd bitauth-ide
yarn
yarn start
```

This will open Bitauth IDE in development mode.

Bitauth IDE uses [Yarn's Zero-Installs strategy](https://yarnpkg.com/features/zero-installs) – all of [Bitauth IDE's dependencies are tracked in an independent git repository](https://github.com/bitauth/bitauth-ide-dependencies), and the dependency repo is automatically shallow-cloned into the `.yarn` directory.

To run all tests:

```sh
yarn test
```

To run all end-to-end tests locally, collect screenshots, and analyze code coverage:

```sh
yarn cov
```

Note that the end-to-end (e2e) tests also visually compare screenshots across test run. Because screenshots will differ slightly between platforms, this repo only stores and records results for `linux`, the platform used by the [continuous integration (CI) environment](./.github/workflows/ci.yml). Screenshots for macOS (`darwin`) and Windows (`win32`) are not committed to the repo, so you will need to run the tests once (prior to making any changes) to locally generate the baseline screenshots for your platform.

You can also run the e2e tests on the same platform as the CI environment using Docker. First, make sure Docker is running locally (consider using [Docker Desktop](https://www.docker.com/products/docker-desktop/)), then:

```sh
yarn start
# in another tab:
yarn e2e:docker
```

To run the e2e tests in Playwright's UI mode:

```sh
yarn e2e
```

To open the e2e test report in a browser (e.g. to review visual differences between screenshots):

```sh
yarn e2e:report
```

To build and run the production Progressive Web App (PWA):

```sh
yarn build
yarn preview
```

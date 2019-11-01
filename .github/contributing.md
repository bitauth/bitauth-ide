# Contributing to Bitauth IDE

Pull requests are welcome! Here are some miscellaneous notes on the project.

### Why did we eject `create-react-app`?

To get Monaco working fully, we need to add some steps to the build process. We're currently only adding the following lines to `webpack.config.js`:

```js
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

// later, inside the `plugins` array:

new MonacoWebpackPlugin({ languages: [] });
```

That's all. If you can figure out a way to do that without ejecting, please send a pull request!

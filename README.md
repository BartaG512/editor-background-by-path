# Editor Background By Path


This extension lets you change the background image of your editor based on the active file's path. It helps to:

- Differentiating between projects or environments by setting unique backgrounds.
- Enhance the editor’s background with custom images..
- Identify file types or locations visually..

#### **NOTE: If Visual Studio Code complains about that it is corrupted, simply click “Don't show again”.**
#### **NOTE: Every time after Visual Studio Code is updated, please re-enable Editor Background By Path**
#### **NOTE: Before you uninstall the extension run the Editor Background By Path: Disable command to cleanup the patched JS from vscode files.**

![example](https://github.com/BartaG512/editor-background-by-path/raw/HEAD/images/example.png)

## Getting Started

1. Install this extension.

2. Add to `settings.json`:

```json
"editor_background_by_path.backgrounds": [
  {
    "pattern": "dog",
    "url": "/absolute/path/to/dog.png"
  },
  {
    "pattern": ".*kitten.*app\\.js$",
    "url": "/absolute/path/to/kitten.jpg",
    "background-size": "300px auto",
    "opacity": "0.05", 
    "background-repeat": "repeat"
  }
]
```

3. Visual Studio Code automatically detects changes in configuration applies the configurations.

4. At first time after install Activate command "`Editor Background By Path: Enable`".


## Extension commands

Access the command palette and introduce commands you can use ***Ctrl+Shift+P*** 

- ***Editor Background By Path: Enable***: It will enable the extension.
- ***Editor Background By Path: Disable***: It will disable the extension.
- ***Editor Background By Path: Reload***: Disable and then re-enable it.

## Configuration 

In the `editor_background_by_path.backgrounds` array, you can define background images for specific files or paths in your project. Each item in the array can contain several optional properties, including valid CSS key-value pairs, which allow you to further customize the background appearance.

| Property   | Type               | Description                                                                                                                     |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `pattern`  | `string` / `regex` | **Required**. A string or regular expression used to match file paths or filenames.                                             |
| `url`      | `string`           | **Optional**. Specifies the path to the background image. Can be a local absolute path or a web URL.                            |
| Custom CSS | `key-value pairs`  | **Optional**. Additional CSS properties for further customization of the background (e.g., `background-size`, `opacity`, etc.). |

#### You can add the same image to all editors with the following configuration:

```json
"editor_background_by_path.backgrounds": [
  {
    "pattern": ".*",
    "url": "/absolute/path/to/image-for-all-editors.png"
  },
]
```

#### Default Background Settings
When applying a background, the extension uses the following default styles (no need to specify them separately):

```json
{
  "background-size": "100px auto",
  "opacity": "0.6",
  "background-repeat": "no-repeat",
  "background-position": "100% 100%"
}
```

## Windows users 

**In Windows, make sure you run your Visual Studio Code in Administrator mode before enabling or disabling your custom style!**

## Mac and Linux users
**The extension would NOT work if Visual Studio Code cannot modify itself.** The cases include:

- Code files being read-only, like on a read-only file system or,
- Code is not started with the permissions to modify itself.

**You need to claim ownership on Visual Studio Code's installation directory, by running this command**:

```sh
sudo chown -R $(whoami) "$(which code)"
sudo chown -R $(whoami) /usr/share/code
```

The placeholder `<Path to Visual Studio Code>` means the path to VSCode installation. It is typically:

- `/Applications/Visual Studio Code.app/Contents/MacOS/Electron`, on MacOS;
- `/Applications/Visual Studio Code - Insiders.app/Contents/MacOS/Electron`, on MacOS when using Insiders branch;
- `/usr/share/code`, on most Linux;
- `/usr/lib/code/` or `/opt/visual-studio-code` on Arch Linux.

Mac and Linux package managers may have customized installation path. Please double check your path is correct.

# Disclaimer

This extension modifies some Visual Studio Code files so use it at your own risk.
This extension solves this issue by injecting code into:

- `electron-browser/index.html`.

The extension will keep a copy of the original file in case something goes wrong. That's what the disable command will do for you.

As this extension modifies Visual Studio Code files, it will get disabled with every Visual Studio Code update. You will have to enable the extension via the command palette.

Take into account that this extension is still in beta, so you may find some bugs while playing with it. Please, report them to [the issues section of the Github's repo](https://github.com/BartaG512/editor-background-by-path/).

(Extension based on the [Custom CSS and JS Readme](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css). Thanks to  [be5invis](https://github.com/be5invis))
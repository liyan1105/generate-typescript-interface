import * as vscode from "vscode";
import { Range } from "vscode";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "extension.tsGenerate",
    () => {
      const editor = vscode.window.activeTextEditor!;
      const selection = editor.selection;

      if (!selection.isEmpty) {
        editor.edit(builder => {
          const start = selection.start.line;
          const end = selection.end.line;
          for (let i = start; i <= end; i += 1) {
            const line = editor.document.lineAt(i);
            const range = new Range(
              i,
              line.range.start.character,
              i,
              line.range.end.character
            );
            builder.replace(range, generate(line.text));
          }
        });
      }
    }
  );

  context.subscriptions.push(disposable);
}

function generate(text: string): string {
  function isJavaClass() {
    return text.indexOf("class") !== -1;
  }

  function isJavaEnum() {
    return text.indexOf("enum") !== -1;
  }

  function isPrimitives() {
    const JavaType = [
      "byte",
      "int",
      "integer ",
      "long",
      "float",
      "double",
      "string",
      "boolean"
    ];
    return (
      JavaType.find(v => text.toLocaleLowerCase().indexOf(v) !== -1) != null
    );
  }

  function isStringOrBoolean() {
    return (
      ["String", "Boolean"].find(
        v => text.toLocaleLowerCase().indexOf(v) !== -1
      ) != null
    );
  }

  function isList() {
    return text.indexOf("<") !== -1;
  }

  const cleanText = text
    .replace(";", "")
    .replace(/\/\/.*/, "")
    .replace(/\(.*/, "")
    .trim();

  function generateField() {
    if (cleanText === "") {
      return "";
    } else if (cleanText === "}") {
      return text;
    } else if (!/\s/.test(cleanText)) {
      return generateEnumField();
    } else {
      const texts = cleanText.split(" ");
      const field = texts?.[2] ?? "";

      if (isPrimitives()) {
        const type = isStringOrBoolean()
          ? (texts?.[1] ?? "").toLocaleLowerCase()
          : "number";
        return field + ":" + type;
      } else if (isList()) {
        const type = text.match(/<(.*?)>/)?.[1] ?? "";
        return field + ":" + type + "[]";
      } else {
        return field + ":" + (texts?.[1] ?? "");
      }
    }
  }

  function generateEnumField() {
    const texts = cleanText.toLocaleLowerCase().split("_");

    return (
      texts
        .map((t, i) => {
          return i !== 0
            ? t.replace(/^\S/, s => {
                return s.toUpperCase();
              })
            : t;
        })
        .join("") +
      "=" +
      "'" +
      cleanText +
      "',"
    );
  }

  if (isJavaClass()) {
    return cleanText
      .replace(/(public|private)\s+class/i, "export interface")
      .replace(/(implements|extends).*/, "{");
  } else if (isJavaEnum()) {
    return cleanText.replace(/(public|private)\s+enum/i, "export enum");
  } else {
    return generateField();
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}

/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `list-alerts` command */
  export type ListAlerts = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-instances` command */
  export type ManageInstances = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `list-alerts` command */
  export type ListAlerts = {}
  /** Arguments passed to the `manage-instances` command */
  export type ManageInstances = {}
}


/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: {sub: string, firstName: string, lastName: string}
  }
}
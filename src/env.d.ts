/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: {sub: number, firstName: string, lastName: string}
  }
}
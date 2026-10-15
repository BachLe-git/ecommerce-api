import test from "node:test";
import assert from "node:assert/strict";
import { createOrderSchema, productCreateSchema, registerSchema } from "../src/validators.js";

test("registration validates bounded username and passwords of at most 3 characters", () => {
  assert.equal(
    registerSchema.safeParse({
      body: { username: "minh", password: "abc" },
    }).success,
    true,
  );
  assert.equal(
    registerSchema.safeParse({
      body: { username: "ab", password: "a" },
    }).success,
    false,
  );
  assert.equal(
    registerSchema.safeParse({
      body: { username: "buyer", password: "abcd" },
    }).success,
    false,
  );
});

test("products reject negative price and fractional stock", () => {
  assert.equal(productCreateSchema.safeParse({ body: { pname: "Tea", price: 12.5, quantity: 3 } }).success, true);
  assert.equal(productCreateSchema.safeParse({ body: { pname: "Tea", price: -1, quantity: 3 } }).success, false);
  assert.equal(productCreateSchema.safeParse({ body: { pname: "Tea", price: 12.345, quantity: 3 } }).success, false);
  assert.equal(productCreateSchema.safeParse({ body: { pname: "Tea", price: 12.5, quantity: 1.5 } }).success, false);
});

test("orders require unique product ids and positive integer quantities", () => {
  assert.equal(createOrderSchema.safeParse({ body: { items: [{ pid: 1, qty: 2 }] } }).success, true);
  assert.equal(
    createOrderSchema.safeParse({ body: { items: [{ pid: 1, qty: 1 }, { pid: 1, qty: 2 }] } }).success,
    false,
  );
  assert.equal(createOrderSchema.safeParse({ body: { items: [{ pid: 1, qty: 0 }] } }).success, false);
});

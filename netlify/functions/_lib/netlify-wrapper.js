// netlify-wrapper.js — factory handler Netlify standar.
//
// Setiap file di netlify/functions/<nama>.js hanyalah:
//   exports.handler = makeHandler();
// dan seluruh logika dipusatkan di _lib/handlers.js (dispatch per action).
"use strict";

const { handleAction } = require("./handlers");

function makeHandler() {
  return async (event) => {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      /* body non-JSON -> action kosong */
    }
    let out;
    try {
      out = await handleAction(body.action, body.payload, body.sessionToken);
    } catch (e) {
      out = { success: false, message: "Error internal: " + e.message };
    }
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(out),
    };
  };
}

module.exports = { makeHandler };

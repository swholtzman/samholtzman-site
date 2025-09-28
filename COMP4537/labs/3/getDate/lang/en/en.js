"use strict";

export default function greeting(username, datetime, timezone) {
  return `<b style="color: blue">
    Hello ${username}, What a beautiful day.
    Server current date and time is ${datetime.toString()}
  </b>`;
}
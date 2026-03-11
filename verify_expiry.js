const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Mock browser environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = {
    _data: {},
    setItem(key, value) { this._data[key] = value.toString(); },
    getItem(key) { return this._data[key] || null; },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};

// Load db.js
const dbCode = fs.readFileSync('c:/Users/ASUS/OneDrive/Desktop/Yoddha/db.js', 'utf8');
eval(dbCode);

// Tests
console.log('Running Verification Tests...');

// 1. Register a player and check default expiry
Database.registerPlayer({
    name: 'Test Player',
    mobile: '1234567890',
    email: 'test@example.com',
    password: 'password'
});

let player = Database.getPlayers().find(p => p.name === 'Test Player');
console.log('Player registered. Expiry Date:', player.expiryDate);

const now = new Date();
const exp = new Date(player.expiryDate);
const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
console.log('Default expiry days from now:', diffDays);
if (diffDays >= 29 && diffDays <= 31) {
    console.log('✅ Default expiry is approximately 30 days.');
} else {
    console.log('❌ Default expiry is NOT 30 days.');
}

// 2. Check Expiry Status - Active
let status = Database.getMemberExpiryStatus(player);
console.log('Current status (should be Active):', status);
if (status === 'Active') console.log('✅ Active status correct.');
else console.log('❌ Active status incorrect.');

// 3. Check Expiry Status - Expiring Soon (Set expiry to 3 days from now)
const soon = new Date();
soon.setDate(soon.getDate() + 3);
player.expiryDate = soon.toISOString();
status = Database.getMemberExpiryStatus(player);
console.log('Status after setting expiry to 3 days (should be Expiring Soon):', status);
if (status === 'Expiring Soon') console.log('✅ Expiring Soon status correct.');
else console.log('❌ Expiring Soon status incorrect.');

// 4. Check Expiry Status - Expired (Set expiry to yesterday)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
player.expiryDate = yesterday.toISOString();
status = Database.getMemberExpiryStatus(player);
console.log('Status after setting expiry to yesterday (should be Expired):', status);
if (status === 'Expired') console.log('✅ Expired status correct.');
else console.log('❌ Expired status incorrect.');

// 5. Send Reminder
Database.sendReminder(player.id, 'Test Reminder');
player = Database.getPlayerById(player.id);
console.log('Reminders count:', player.reminders.length);
if (player.reminders.length === 1 && player.reminders[0].message === 'Test Reminder') {
    console.log('✅ Send Reminder functional.');
} else {
    console.log('❌ Send Reminder failed.');
}

// 6. Add Payment (Renewal)
// Need to mock getBatches or ensure it doesn't crash
Database.addPayment({
    playerId: player.id,
    amount: 1000,
    paymentType: 'Monthly',
    method: 'Cash',
    date: new Date().toISOString()
});

player = Database.getPlayerById(player.id);
console.log('Expiry after payment (should be extended):', player.expiryDate);
status = Database.getMemberExpiryStatus(player);
console.log('Status after payment (should be Active):', status);
if (status === 'Active') console.log('✅ Renewal functional.');
else console.log('❌ Renewal failed.');

console.log('Verification Tests Completed.');

#!/usr/bin/env node

// Simple script to test what the browser would see
const http = require('http');

console.log('🔍 Testing EnrollEagle Application\n');

// Test 1: Check if Vite server responds
function testEndpoint(host, port, path, description) {
    return new Promise((resolve) => {
        const options = {
            hostname: host,
            port: port,
            path: path,
            method: 'GET',
            headers: {
                'Accept': '*/*'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✓ ${description}`);
                console.log(`  Status: ${res.statusCode}`);
                console.log(`  Content-Type: ${res.headers['content-type']}`);
                console.log(`  Length: ${data.length} bytes`);
                if (data.length < 500) {
                    console.log(`  Preview: ${data.substring(0, 200)}`);
                }
                console.log('');
                resolve({ status: res.statusCode, data, headers: res.headers });
            });
        });

        req.on('error', (err) => {
            console.log(`✗ ${description}`);
            console.log(`  Error: ${err.message}\n`);
            resolve({ error: err.message });
        });

        req.end();
    });
}

async function runTests() {
    await testEndpoint('localhost', 5173, '/', 'Vite Dev Server (HTML)');
    await testEndpoint('localhost', 5173, '/src/main.tsx', 'React Entry Point');
    await testEndpoint('localhost', 5173, '/src/styles.css', 'CSS File');
    await testEndpoint('localhost', 5001, '/schools', 'API - Schools');
    await testEndpoint('localhost', 5001, '/me', 'API - /me (should fail without auth)');
    
    console.log('\n📊 Summary:');
    console.log('If all tests pass, the issue is likely in the browser rendering or CSS application.');
    console.log('\nNext steps:');
    console.log('1. Open http://localhost:5173/diagnose.html in your browser');
    console.log('2. Check the DOM Inspection section for element visibility');
    console.log('3. Look for computed styles showing opacity: 0 or display: none');
}

runTests();

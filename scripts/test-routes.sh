#!/bin/bash
set -e
TOKEN=$(curl -s "http://localhost:5001/api/v1/auth/login" -X POST -H "Content-Type: application/json" -d '{"email":"admin@vojas.gov","password":"Admin123!"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.accessToken))")
echo "Got token"
echo "=== projects ==="
curl -s "http://localhost:5001/api/v1/projects?page=1&limit=2" -H "Authorization: Bearer $TOKEN" | head -c 300
echo ""
echo "=== activity ==="
curl -s "http://localhost:5001/api/v1/admin/activity?days=7" -H "Authorization: Bearer $TOKEN" | head -c 500
echo ""
echo "=== search ==="
curl -s "http://localhost:5001/api/v1/search?q=test&type=projects&limit=5" -H "Authorization: Bearer $TOKEN" | head -c 300

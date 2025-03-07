import { CgPluginLibHost } from "@common-ground-dao/cg-plugin-lib-host";

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDZ+U+eBbMuO1c7
mCwvxwUVZfU6c3g5zfEnq40u3jtTe9ItkhK7nN9cTM5LeSPZWqSqZZqfTlwb5SeA
1o6unMIEplJo1llHUxiDUNggUYHEbl79KeRb+xeP4WrfK2tckdWUoFnsrc7Xu+LZ
ryewnJa7sqz5uoQthzN2oFFhud4rBuOGcCNjBSV5jiAdvlT9+MKXRsFJRfI4lux1
kz4qNGzDB+vZ5T2AvZxPjFdzuiRmoM+vN8kj9odtYFNk3voxYzuPgIKJX7wqD9dr
yc1zBaPGxtgsoecl5uR9AJKNYk2se+5o0hVNzGqOZqjz2YV7pO2UxTT+KWgY8xb2
yGOM8eilAgMBAAECggEAXCXG8EV1mcpRVuq+Z1ZKAmFPee3dugYjeENQVKtzRhg2
4rf5fmHTlUgNACAOtTDaIwUACG/OhaZq/E74E75GUUPk29gd9wacessfCw6Z/uov
8vOWTAJK1DMWBJFs+j3WnlXpniJeKpqNzLv82e9g06m18X7VqQ+ahIBC1z8FuocP
KxnF5rlHEBjlcFdtTAzmx49GvLKa+QLgvo6br83NPnujZggVPnd0fQTr4QlGebNV
FeAh6Nx0k6V78GiwL5/80ACc/3mvJ/8HyBnzBaWbP3wu5qDNKQgQbQgw+Mw1Bv5E
lt6Y4GWQMG0a7AOZ/mApq+ne5UqeLvzFv+lm7Cij0wKBgQD/bzYt5NislRjv9qri
EZxfmE2TQPVNJgZavaQKgVJ/PhlFbN8MQur6eDw1THaOMwK+2gUeu0Ta/10TZJ7o
hhzyanrGAlc4zN9ieUc8watb2cfyZPAlimeimiVYjNmc5CwU5r8A/TO+zdQT0ZIi
0Pxz2PPwCanksWzH4T575vwU3wKBgQDadN2TtcwQSE0qHd/G/ngzZ890Iw1zHEu+
DYWKJuTKsg6bnjpDFpLonYuMPkns35qofNoS+VWUIKLR8/uhu3YlJT/dlAqjG0Tj
fBZmbrxCO6lTm+PblSzCDvso/cPQiLXAsCX1iBxxPo/9+/NwhuNx7gN7RDwjxzlj
U85R1sLO+wKBgDMW10tOnlfGanp0Z7FXvGMSX1G4iFep51N24ryHKSzyCrPsFqCp
Mb5vFfvDE2NVqJLroGKJKjhzIvaiBXaUfG2wBmZcSX2+3F8hyrHIOrHgWTGOJsob
aKcJFbckVNIggQCdNk7IVfUvzd8453W3PwccuY2lISnwosVHs+usQ3cZAoGAZPJT
4YnEflGqtqePXJkCWl7CElyQPnz40x3Uc359gty8u1Rmf9HSmQMUFP5Dkt3QzcLD
0ri8vvJFytb/lEDX21pXJMDgGXbkYmpYv4S0IbcIC8ahiDpqsFHT5aE99wL1WdEL
+WWoHvxV9XuThpAOUfs2SKPDVpUdA7UaRd8DrjkCgYEA2QtG0Op8UXwl7RCiWEQt
MByCLNQacukZwj/eNwSX3dqXy+gSriAQJbwLZOVrPRtIC1q4VCY9i3F9kgoBAo+5
LuD9BNi6g8G2/kp9CGTMCaFyexsN4Zm0bnDQ7H9T6jYkbwMm5Dxfauu6v8Lb+BVM
kINANejyFX7pYDQKD2MqkCE=
-----END PRIVATE KEY-----`;

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2flPngWzLjtXO5gsL8cF
FWX1OnN4Oc3xJ6uNLt47U3vSLZISu5zfXEzOS3kj2VqkqmWan05cG+UngNaOrpzC
BKZSaNZZR1MYg1DYIFGBxG5e/SnkW/sXj+Fq3ytrXJHVlKBZ7K3O17vi2a8nsJyW
u7Ks+bqELYczdqBRYbneKwbjhnAjYwUleY4gHb5U/fjCl0bBSUXyOJbsdZM+KjRs
wwfr2eU9gL2cT4xXc7okZqDPrzfJI/aHbWBTZN76MWM7j4CCiV+8Kg/Xa8nNcwWj
xsbYLKHnJebkfQCSjWJNrHvuaNIVTcxqjmao89mFe6TtlMU0/iloGPMW9shjjPHo
pQIDAQAB
-----END PUBLIC KEY-----`;

export async function POST(req: Request) {
    const body = await req.json();

    const cgPluginLibHost = await CgPluginLibHost.initialize(privateKey, publicKey);
    const { request, signature } = await cgPluginLibHost.signRequest(body);

    return Response.json({ request, signature });
}
import { CgPluginLibHost } from "@common-ground-dao/cg-plugin-lib-host";

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDMUr7MyVWQLK4T
QmCWmngFdNcVk3/I25d1JSiyJHS4tMmr0bTg3Ol/Vj04cQknM+i3Gpggaur/yxL9
aylpIMcfX86RM2hlcI7ND900nKQcXggI/tisfcUcodacv6ecaHYykuTGI3g2t9cO
yv6vCKI6Zaf84zadM4EGaDmfUSSNBoRDUXf7X03gkCNw2GCx0rT5QXx8reymNilj
2usD1WPtt5rYzQ46+BD/HJeeb6ljzXfajk04L0DROEKTDt3vELT0qvCjwZoSINdy
HdPAmiVMcM+GJXYVdtmHLszWlXAT9qH+pVjaQzLmyowigPEVDgu0kqkq/AXinj6t
BA818LYRAgMBAAECgf9XiU1N6wRqwEYFZaSACpTtbu+/NeW6vHqKGLw96InGmFLn
OUNuTMMn/F8lW5qxUf+K5m6IfTV7N/kL0w7zA3sR9fnknnQ8fUbiUbgQbyyVwNyo
Jzxq7AvZQLaQYLUb2bXBonearckVAxlyds/PiEZ8nVLXBTbUVCO5L6OhQwE8ghQq
EfwNdZwwhk6MiTa9u7wFYLHFqWLlQCFiqUqrJryDbltGzx+JK/Jr401tzHx9uhSX
YNt7atAV7qAU39xS07Zui/62d088bRQDotUh3KYpibsB21lZa4YwNOP07B4lbjT+
e6QqJYUb1B3KNQNKGwEtCqWbMaP4Y45un9tk0WECgYEA9AMUKbOjxr3lUWm/9Qcw
5XcMQdtFT2l3Wc07zhC09vXiWic0newCb2C0fFgWjAh+OS1pLd7WL2JL5ixgkY3M
wtvce1NtQMQl9MvlbFuc7QMXce8l6J/MR/GoHmMs2O5VQwWXpne/XKEY5PGpIGBN
PFWJhM0UB4louD8xJPJ4ALMCgYEA1lyA35zB4w+HenB/X80Dow5eoJsBd8usTab+
qYHA/IIiR+034czD8JK+vKTBq5aYc7GSFHS3Zp8uA6w3Kt0ZslItYwOB7NLQSdQj
mpuwLWND7mNBbnwAxkz390FmAdRQIeWscJJyDQSBA8ojy7UBBvWEImcpmeY927QH
GMCxCCsCgYBVop7446qenRZVtB9CBvwKC/WpRyLT89eHFJfggcyAv1po+UlmAuX3
4KB24xNGodRqjJ1VE9dnWb/5T6m0a2dpG3ANeAHnsO8BMm2Z0a0JIQShX6SWNz6i
IRU3VObwWvRhSR0ntu7Zu0/ZSVZpnmJ8wig5Cx/0ZSzzPHoq1U14MQKBgBOaJ+rK
4ewKmn/2058GF2QMx1h2dD7pMBt1vunvRJ+SouHi7m5GlFBmiuyjQFaZkd1aipo2
RiMrQUDyuaTAzT3CSAY65uGqMYPe01arEARGhIrDJtOcoVGA7lf88gAO0zkWUJuG
uMk59TZMgNN6/NoPD4M53dMF+/ggUVnRHR87AoGBAOkEFn5Q5veEVnfYrALBfZ1M
OzbbR198d2ygZXlTDWrjDaTKYBvTqqyYpoe3RHhGn8uyc+xbHscXxxySJXK9Z8Fg
t431leahijkMWFFO5xN1JkpdwQ22YbfG5enXs0tQuupTcmbkjF+fGHHaPc4NgwPI
M00BmdHjxYDZsgjGz/8W
-----END PRIVATE KEY-----`;

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzFK+zMlVkCyuE0Jglpp4
BXTXFZN/yNuXdSUosiR0uLTJq9G04Nzpf1Y9OHEJJzPotxqYIGrq/8sS/WspaSDH
H1/OkTNoZXCOzQ/dNJykHF4ICP7YrH3FHKHWnL+nnGh2MpLkxiN4NrfXDsr+rwii
OmWn/OM2nTOBBmg5n1EkjQaEQ1F3+19N4JAjcNhgsdK0+UF8fK3spjYpY9rrA9Vj
7bea2M0OOvgQ/xyXnm+pY8132o5NOC9A0ThCkw7d7xC09Krwo8GaEiDXch3TwJol
THDPhiV2FXbZhy7M1pVwE/ah/qVY2kMy5sqMIoDxFQ4LtJKpKvwF4p4+rQQPNfC2
EQIDAQAB
-----END PUBLIC KEY-----`;

export async function POST(req: Request) {
    const body = await req.json();

    const cgPluginLibHost = await CgPluginLibHost.initialize(privateKey, publicKey);
    const { request, signature } = await cgPluginLibHost.signRequest(body);

    return Response.json({ request, signature });
}
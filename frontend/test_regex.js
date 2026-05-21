const query = "I'm coming from San Francisco, California to Monterey, California. Find me the best mess on the route,";
const lowerQuery = query.toLowerCase();

let result = { origin: "", destination: "" };

const routeMatch = lowerQuery.match(/(?:from\s+)(.+?)\s+(?:going to|heading to|to)\s+(.+?)(?:\s+this|\s+on|\s+with|\s+find|\s+show|\s+for|\s+near|\s*$)/i) ||
                     lowerQuery.match(/^(.+?)\s+to\s+(.+?)(?:\s+this|\s+on|\s+with|\s+find|\s+show|\s+for|\s+near|\s*$)/i);

if (routeMatch) {
    result.origin = routeMatch[1].trim().replace(/^i'm coming /i, '').replace(/^coming /i, '');
    let dest = routeMatch[2].trim();
    dest = dest.replace(/\b(find|show|give|me|masses|mass|tlm|churches)\b.*/ig, "").trim();
    result.destination = dest;
    console.log(result);
} else {
    console.log("No match");
}

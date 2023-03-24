const ACCEPTED_SUBNETS = ["149.154.160.0/20", "91.108.4.0/22"];

function isIpInSubnet(ip: string, subnet: string): boolean {
  const [subnetAddress, subnetMask] = subnet.split("/");
  const subnetBits = parseInt(subnetMask, 10);
  const subnetMaskBits = ~((1 << (32 - subnetBits)) - 1);
  const subnetStart = (ip4ToNum(subnetAddress) & subnetMaskBits) >>> 0;
  const subnetEnd = (subnetStart + (1 << (32 - subnetBits))) >>> 0;
  const ipNum = ip4ToNum(ip);
  return ipNum >= subnetStart && ipNum <= subnetEnd;
}

function ip4ToNum(ip: string): number {
  return (
    ip
      .split(".")
      .reduce(
        (acc: number, octet: string, index: number) =>
          acc + (parseInt(octet, 10) << ((3 - index) * 8)),
        0
      ) >>> 0
  );
}

function onlyAcceptSubnets(req, res, next): void {
  const ipAddress =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.connection.remoteAddress;
  const isPostRequest = req.method === "POST";
  const isAcceptedSubnet = ACCEPTED_SUBNETS.some((subnet) =>
    isIpInSubnet(ipAddress, subnet)
  );
  if (isPostRequest && isAcceptedSubnet) {
    return next();
  }
  console.error(
    `Unauthorized request from ${ipAddress}, headers: ${JSON.stringify(
      req.headers
    )}, body: ${JSON.stringify(req.body)}`
  );
  res.status(403).send("Forbidden");
}

export default onlyAcceptSubnets;

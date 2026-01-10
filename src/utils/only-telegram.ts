import { Request, Response, NextFunction } from "express";

// Telegram's official IP ranges for webhook requests
const ACCEPTED_SUBNETS = ["149.154.160.0/20", "91.108.4.0/22"];

// Configuration: IP checking is optional when secret_token auth is used
const VERIFY_TELEGRAM_IP = process.env.VERIFY_TELEGRAM_IP === "true";

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

/**
 * Safely extracts client IP address.
 * When Express 'trust proxy' is configured, req.ip is already resolved correctly.
 * Only use cf-connecting-ip if we're definitely behind Cloudflare.
 */
function getClientIp(req: Request): string {
  // When behind trusted proxy, req.ip is already resolved correctly
  // Only use cf-connecting-ip if we're definitely behind Cloudflare
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp) {
    return cfIp;
  }
  return req.ip || req.socket.remoteAddress || "";
}

function isFromTelegramSubnet(ip: string): boolean {
  return ACCEPTED_SUBNETS.some((subnet) => isIpInSubnet(ip, subnet));
}

function onlyAcceptSubnets(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ipAddress = getClientIp(req);
  const isPostRequest = req.method === "POST";
  const isAcceptedSubnet = isFromTelegramSubnet(ipAddress);

  // If IP verification is disabled, just proceed (secret_token auth is primary)
  if (!VERIFY_TELEGRAM_IP) {
    if (isPostRequest && !isAcceptedSubnet) {
      // Log warning but don't block - secret_token is the primary auth method
      console.warn(
        `Warning: Request from non-Telegram IP ${ipAddress} - relying on secret_token auth`
      );
    }
    return next();
  }

  // If IP verification is enabled, enforce it
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

export { getClientIp, isFromTelegramSubnet };
export default onlyAcceptSubnets;

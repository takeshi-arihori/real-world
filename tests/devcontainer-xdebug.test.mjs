import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const readJson = (path) =>
  JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));

const readText = (path) => readFileSync(resolve(repoRoot, path), "utf8");

const normalizeEnvironment = (environment) => {
  if (Array.isArray(environment)) {
    return Object.fromEntries(
      environment.map((entry) => {
        const [key, ...valueParts] = entry.split("=");

        return [key, valueParts.join("=")];
      }),
    );
  }

  return environment ?? {};
};

test("devcontainer compose enables backend Xdebug only by trigger", () => {
  const resolvedConfig = JSON.parse(
    execFileSync(
      "docker",
      [
        "compose",
        "-f",
        "compose.yml",
        "-f",
        ".devcontainer/docker-compose.yml",
        "config",
        "--format",
        "json",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    ),
  );

  const backendPhp = resolvedConfig.services["backend-php"];
  const environment = normalizeEnvironment(backendPhp.environment);

  assert.equal(environment.XDEBUG_MODE, "develop,debug");
  assert.equal(environment.XDEBUG_START_WITH_REQUEST, "trigger");
  assert.equal(environment.XDEBUG_CONFIG, "client_host=devcontainer client_port=9003");
});

test("PHP Xdebug ini defaults to trigger start", () => {
  const xdebugIni = readText("docker/backend/php/xdebug.ini");

  assert.match(
    xdebugIni,
    /^xdebug\.start_with_request=\$\{XDEBUG_START_WITH_REQUEST:-trigger\}$/m,
  );
  assert.doesNotMatch(xdebugIni, /^xdebug\.start_with_request=yes$/m);
});

test("devcontainer installs PHP debug support", () => {
  const devcontainer = readJson(".devcontainer/devcontainer.json");
  const extensions = devcontainer.customizations.vscode.extensions;

  assert.ok(extensions.includes("xdebug.php-debug"));
});

test("VS Code listens for backend PHP Xdebug sessions", () => {
  const launch = readJson(".vscode/launch.json");
  const configuration = launch.configurations.find(
    (candidate) =>
      candidate.type === "php" &&
      candidate.request === "launch" &&
      candidate.port === 9003,
  );

  assert.ok(configuration, "expected a PHP launch listener on port 9003");
  assert.equal(configuration.hostname, "0.0.0.0");
  assert.equal(
    configuration.pathMappings["/var/www/html"],
    "${workspaceFolder}/backend",
  );
});

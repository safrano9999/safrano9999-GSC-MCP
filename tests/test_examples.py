import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ContainerExamplesTest(unittest.TestCase):
    def render(self, *, port="", volume=""):
        with tempfile.TemporaryDirectory(prefix="gsc-example-test-") as directory:
            root = Path(directory)
            for filename in ("config.sh", "env.example", "container.example"):
                shutil.copy2(ROOT / filename, root / filename)
            (root / "gsc-test.env").write_text("GOOGLE_CLIENT_EMAIL=\nGOOGLE_PRIVATE_KEY=\n")
            (root / "gsc-test_container.conf").write_text(
                "CONTAINER_NAME=gsc-test\n"
                "IMAGE=ghcr.io/safrano9999/safrano9999-gsc-mcp:latest\n"
                "GSC_MCP_PUBLISH_HOST=127.0.0.1\n"
                f"GSC_MCP_PUBLISH_PORT={port}\n"
                f"GSC_MCP_VOLUMES={volume}\n"
                "ADDITIONAL_LINE=Pull=never\n"
                "ADDITIONAL_LINE_02=Network=core\n"
            )
            subprocess.run(
                ["bash", str(root / "config.sh"), "--render-container"],
                cwd=root, check=True, input="", text=True, capture_output=True,
                env={**os.environ, "CONFIG_CONTAINER_NAME": "gsc-test",
                     "CONFIG_CONTAINER_IMAGE": "ghcr.io/safrano9999/safrano9999-gsc-mcp:latest"},
            )
            return (root / "gsc-test.container").read_text()

    def test_private_network_without_volume(self):
        quadlet = self.render()
        self.assertNotIn("PublishPort=", quadlet)
        self.assertNotIn("Volume=", quadlet)
        self.assertNotIn("Exec=", quadlet)
        self.assertIn("Pull=never", quadlet)
        self.assertIn("Network=core", quadlet)
        self.assertIn("Image=ghcr.io/safrano9999/safrano9999-gsc-mcp:latest", quadlet)

    def test_external_port_does_not_change_internal_port(self):
        quadlet = self.render(port="18000", volume="${CONTAINER_NAME}-data:/data:Z")
        self.assertIn("PublishPort=127.0.0.1:18000:8000", quadlet)
        self.assertIn("Volume=gsc-test-data:/data:Z", quadlet)


if __name__ == "__main__":
    unittest.main()

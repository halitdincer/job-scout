class Jobscout < Formula
  desc "Run-once job scraper"
  homepage "https://github.com/your-org/job-scout"
  url "https://github.com/your-org/job-scout/archive/refs/tags/v1.0.0.tar.gz"
  sha256 "REPLACE_WITH_SHA256"
  license "ISC"

  depends_on "node"

  def install
    system "npm", "install", "--production"
    system "npm", "run", "build"

    libexec.install Dir["*"]
    bin.install_symlink libexec/"bin/jobscout"
    bin.env_script_all_files(libexec/"bin", NODE_PATH: libexec/"node_modules")
  end

  test do
    system "#{bin}/jobscout", "--help"
  end
end

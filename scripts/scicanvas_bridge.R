# Send plots from R / RStudio to an open SciCanvas (copied to ~/.scicanvas/scicanvas.R by SciCanvas).
#
#   source("~/.scicanvas/scicanvas.R")
#   scicanvas_send(p, width = 3, height = 2.5, name = "Fig 2B")   # a ggplot
#   scicanvas_send()                                              # the last ggplot, or else the current base plot
#
# The plot arrives on the page SciCanvas has open, at the given size (inches). With svglite installed its text stays
# editable text. Uses curl, which macOS and Windows 10+ include.
scicanvas_send <- function(p = NULL, width = 4, height = 3, name = "R plot") {
  cfg_file <- file.path(path.expand("~"), ".scicanvas", "bridge.json")
  if (!file.exists(cfg_file)) stop("SciCanvas isn't running: open it, then send again.")
  cfg <- paste(readLines(cfg_file, warn = FALSE), collapse = "")
  port <- sub('.*"port":\\s*([0-9]+).*', "\\1", cfg)
  token <- sub('.*"token":\\s*"([0-9a-f]+)".*', "\\1", cfg)
  if (is.null(p)) {
    lp <- if (requireNamespace("ggplot2", quietly = TRUE)) ggplot2::last_plot() else NULL
    p <- if (!is.null(lp)) lp else if (!is.null(grDevices::dev.list())) grDevices::recordPlot() else stop("No plot to send: pass a ggplot, or draw a base plot first.")
  }
  f <- tempfile(fileext = ".svg")
  on.exit(unlink(f), add = TRUE)
  if (requireNamespace("svglite", quietly = TRUE)) svglite::svglite(f, width = width, height = height, bg = "transparent") else grDevices::svg(f, width = width, height = height, bg = "transparent")
  dev <- grDevices::dev.cur()
  tryCatch(if (inherits(p, "recordedplot")) grDevices::replayPlot(p) else print(p), finally = grDevices::dev.off(dev))
  url <- sprintf("http://127.0.0.1:%s/svg?name=%s&source=R&width=%s&height=%s", port, utils::URLencode(name, reserved = TRUE), width, height)
  out <- suppressWarnings(system2("curl", c("-s", "-S", "-f", "-X", "POST", "-H", shQuote(paste0("X-SciCanvas-Token: ", token)),
    "-H", shQuote("Content-Type: image/svg+xml"), "--data-binary", shQuote(paste0("@", f)), shQuote(url)), stdout = TRUE, stderr = TRUE))
  status <- attr(out, "status")
  if (!is.null(status) && status != 0) stop("Couldn't reach SciCanvas (is it open?): ", paste(out, collapse = " "))
  invisible(TRUE)
}

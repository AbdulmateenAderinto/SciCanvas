# SciCanvas plot worker (R). SciCanvas starts it once and keeps it running, so ggplot2 and the graphics device
# load once and each plot renders in a fraction of a second.
#
# Protocol: one request per line on stdin, "<id>\t<folder>". The folder holds code.R, params.dcf (width and height
# in inches, fontsize in pt) and data.tsv (name<TAB>path lines). The worker writes out.svg, log.txt and, on
# failure, error.txt into the folder, then prints "DONE <id>".
#
# The code runs with: data (a named list of file paths) and read(name), which loads a data file as a data frame
# (CSV, TSV; Excel with readxl); PALETTE (the figure's colours, also ggplot2's and base R's default colours), WIDTH
# and HEIGHT (inches) and FONT_SIZE (pt), the figure's plot style. Every value the code leaves visible is printed, as at the console, so a ggplot
# draws itself. With svglite installed, text stays text in the SVG and can be edited in SciCanvas; R's built-in
# svg() device turns text into shapes.
has_svglite <- requireNamespace("svglite", quietly = TRUE)
has_ggplot <- requireNamespace("ggplot2", quietly = TRUE)
if (has_ggplot) suppressPackageStartupMessages(library(ggplot2))

run_request <- function(dir) {
  p <- read.dcf(file.path(dir, "params.dcf"))
  w <- as.numeric(p[1, "width"]); h <- as.numeric(p[1, "height"]); fs <- as.numeric(p[1, "fontsize"])
  family <- if ("family" %in% colnames(p) && nzchar(p[1, "family"])) p[1, "family"] else "Arial"
  pal <- if ("palette" %in% colnames(p) && nzchar(p[1, "palette"])) strsplit(p[1, "palette"], ",", fixed = TRUE)[[1]] else character()
  dfile <- file.path(dir, "data.tsv")
  paths <- if (file.exists(dfile) && file.info(dfile)$size > 0) read.delim(dfile, header = FALSE, stringsAsFactors = FALSE, quote = "", col.names = c("name", "path")) else data.frame(name = character(), path = character())
  data <- setNames(as.list(paths$path), paths$name)
  env <- new.env(parent = globalenv())
  env$data <- data
  env$PALETTE <- pal; env$WIDTH <- w; env$HEIGHT <- h; env$FONT_SIZE <- fs
  options(ggplot2.discrete.colour = if (length(pal)) pal else NULL, ggplot2.discrete.fill = if (length(pal)) pal else NULL)
  if (length(pal)) grDevices::palette(pal) else grDevices::palette("default")
  env$read <- function(name, ...) {
    path <- data[[name]]
    if (is.null(path)) stop(sprintf("No data file called '%s'. Attached: %s", name, if (length(data)) paste(names(data), collapse = ", ") else "none"))
    ext <- tolower(tools::file_ext(path))
    if (ext %in% c("xlsx", "xls")) {
      if (!requireNamespace("readxl", quietly = TRUE)) stop("Reading Excel files needs the readxl package: install.packages('readxl')")
      return(as.data.frame(readxl::read_excel(path, ...)))
    }
    if (ext %in% c("tsv", "txt")) read.delim(path, check.names = FALSE, ...) else read.csv(path, check.names = FALSE, ...)
  }
  out <- file.path(dir, "out.svg")
  if (has_ggplot) theme_set(theme_classic(base_size = fs, base_family = family) + theme(axis.line = element_line(linewidth = 0.4), axis.ticks = element_line(linewidth = 0.4),
    axis.text = element_text(size = fs - 1, colour = "black"), legend.text = element_text(size = fs - 1), strip.text = element_text(size = fs), strip.background = element_blank()))
  opened <- tryCatch({
    if (has_svglite) svglite::svglite(out, width = w, height = h, pointsize = fs, bg = "transparent", system_fonts = list(sans = family)) else grDevices::svg(out, width = w, height = h, pointsize = fs, bg = "transparent")
    TRUE
  }, warning = function(wn) FALSE, error = function(e) FALSE)
  if (!opened) {
    while (!is.null(dev.list())) dev.off()
    writeLines("R can't write SVG on this computer without the svglite package (R's own svg() needs XQuartz on a Mac). Install it with install.packages('svglite'), or click Install svglite in the plot window.", file.path(dir, "error.txt"))
    return(invisible())
  }
  dev <- dev.cur()
  msgs <- character()
  err <- NULL
  printed <- tryCatch({
    capture.output(withCallingHandlers({
      exprs <- parse(text = readLines(file.path(dir, "code.R"), warn = FALSE, encoding = "UTF-8"))
      for (e in exprs) { v <- withVisible(eval(e, env)); if (v$visible) print(v$value) }
    }, message = function(m) { msgs <<- c(msgs, conditionMessage(m)); invokeRestart("muffleMessage") },
       warning = function(wn) { msgs <<- c(msgs, paste("Warning:", conditionMessage(wn))); invokeRestart("muffleWarning") }))
  }, error = function(e) { err <<- conditionMessage(e); character() })
  if (dev %in% dev.list()) dev.off(dev)
  writeLines(c(printed, msgs), file.path(dir, "log.txt"))
  if (!is.null(err)) writeLines(err, file.path(dir, "error.txt"))
}

cat("READY ", sprintf('{"r":"%s","ggplot2":%s,"svglite":%s}', paste(R.version$major, R.version$minor, sep = "."),
  if (has_ggplot) sprintf('"%s"', as.character(packageVersion("ggplot2"))) else "null",
  if (has_svglite) sprintf('"%s"', as.character(packageVersion("svglite"))) else "null"), "\n", sep = "")
flush(stdout())
con <- file("stdin")
open(con)
while (length(line <- readLines(con, n = 1)) > 0) {
  if (!nzchar(line)) next
  parts <- strsplit(line, "\t", fixed = TRUE)[[1]]
  tryCatch(run_request(parts[2]), error = function(e) writeLines(paste("SciCanvas plot worker:", conditionMessage(e)), file.path(parts[2], "error.txt")))
  while (!is.null(dev.list())) dev.off()
  cat("DONE ", parts[1], "\n", sep = "")
  flush(stdout())
}

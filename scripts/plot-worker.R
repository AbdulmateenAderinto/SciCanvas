# SciCanvas plot worker (R). SciCanvas starts it once and keeps it running, so ggplot2 and the graphics device
# load once and each plot renders in a fraction of a second.
#
# Protocol: one request per line on stdin, "<id>\t<folder>". The folder holds code.R, params.dcf, data.tsv
# (name<TAB>path lines) and, optionally, prelude.R (the figure's shared plot code, run first). The worker writes
# out.svg, axes.json (where the panels sit), log.txt and, on failure, error.txt into the folder, then prints
# "DONE <id>".
#
# params.dcf: width / height (inches, the size the plot PRINTS at), fontsize, ticksize, labelsize, titlesize,
# legendsize (pt), family, palette (#rrggbb,...) and margins (left,right,top,bottom in mm; empty = automatic).
#
# The code runs with: data (a named list of file paths), read(name) (a data file as a data frame: CSV, TSV; Excel
# with readxl), PALETTE (also ggplot2's and base R's default colours), WIDTH and HEIGHT (in), FONT_SIZE and the
# other sizes (pt). Every value the code leaves visible is printed, as at the console, so a ggplot draws itself.
# With svglite installed, text stays text in the SVG and can be edited in SciCanvas; R's built-in svg() device
# (which needs XQuartz on a Mac) turns text into shapes.
has_svglite <- requireNamespace("svglite", quietly = TRUE)
has_ggplot <- requireNamespace("ggplot2", quietly = TRUE)
if (has_ggplot) suppressPackageStartupMessages(library(ggplot2))

num <- function(p, k, default) if (k %in% colnames(p) && nzchar(p[1, k])) as.numeric(p[1, k]) else default
mm_w <- function(u) grid::convertWidth(sum(u), "mm", valueOnly = TRUE)
mm_h <- function(u) grid::convertHeight(sum(u), "mm", valueOnly = TRUE)

# A ggplot as a gtable; with fixed margins (mm), the outer margins absorb the difference so the panels' edges sit
# exactly that far from the plot's edges, whatever the axis labels need (panels line up across plots).
plot_table <- function(p, m) {
  g <- ggplot2::ggplotGrob(p)
  pn <- g$layout[grepl("^panel", g$layout$name), ]
  l <- min(pn$l); r <- max(pn$r); t <- min(pn$t); b <- max(pn$b); nw <- length(g$widths); nh <- length(g$heights)
  if (length(m) == 4) {
    if (l > 1) g$widths[1] <- g$widths[1] + grid::unit(m[1] - mm_w(g$widths[1:(l - 1)]), "mm")
    if (r < nw) g$widths[nw] <- g$widths[nw] + grid::unit(m[2] - mm_w(g$widths[(r + 1):nw]), "mm")
    if (t > 1) g$heights[1] <- g$heights[1] + grid::unit(m[3] - mm_h(g$heights[1:(t - 1)]), "mm")
    if (b < nh) g$heights[nh] <- g$heights[nh] + grid::unit(m[4] - mm_h(g$heights[(b + 1):nh]), "mm")
  }
  box <- c(left = if (l > 1) mm_w(g$widths[1:(l - 1)]) else 0, right = if (r < nw) mm_w(g$widths[(r + 1):nw]) else 0,
           top = if (t > 1) mm_h(g$heights[1:(t - 1)]) else 0, bottom = if (b < nh) mm_h(g$heights[(b + 1):nh]) else 0)
  list(g = g, box = box)
}

run_request <- function(dir) {
  p <- read.dcf(file.path(dir, "params.dcf"))
  w <- num(p, "width", 4); h <- num(p, "height", 3); fs <- num(p, "fontsize", 7)
  ts <- num(p, "ticksize", fs - 1); ls <- num(p, "labelsize", fs); tt <- num(p, "titlesize", fs + 1); lg <- num(p, "legendsize", fs - 1)
  family <- if ("family" %in% colnames(p) && nzchar(p[1, "family"])) p[1, "family"] else "Arial"
  pal <- if ("palette" %in% colnames(p) && nzchar(p[1, "palette"])) strsplit(p[1, "palette"], ",", fixed = TRUE)[[1]] else character()
  margins <- if ("margins" %in% colnames(p) && nzchar(p[1, "margins"])) as.numeric(strsplit(p[1, "margins"], ",", fixed = TRUE)[[1]]) else numeric()
  dfile <- file.path(dir, "data.tsv")
  paths <- if (file.exists(dfile) && file.info(dfile)$size > 0) read.delim(dfile, header = FALSE, stringsAsFactors = FALSE, quote = "", col.names = c("name", "path")) else data.frame(name = character(), path = character())
  data <- setNames(as.list(paths$path), paths$name)
  env <- new.env(parent = globalenv())
  env$data <- data
  env$PALETTE <- pal; env$WIDTH <- w; env$HEIGHT <- h; env$FONT_SIZE <- fs
  env$TICK_SIZE <- ts; env$LABEL_SIZE <- ls; env$TITLE_SIZE <- tt; env$LEGEND_SIZE <- lg; env$MARGINS <- margins
  options(ggplot2.discrete.colour = if (length(pal)) pal else NULL, ggplot2.discrete.fill = if (length(pal)) pal else NULL)
  if (length(pal) >= 2) grDevices::palette(pal) else grDevices::palette("default")
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
  if (has_ggplot) theme_set(theme_classic(base_size = fs, base_family = family) + theme(
    axis.line = element_line(linewidth = 0.4), axis.ticks = element_line(linewidth = 0.4),
    axis.text = element_text(size = ts, colour = "black"), axis.title = element_text(size = ls),
    plot.title = element_text(size = tt), legend.text = element_text(size = lg), legend.title = element_text(size = ls),
    strip.text = element_text(size = ls), strip.background = element_blank()))
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
  if (length(margins) == 4) par(mai = margins[c(4, 1, 3, 2)] / 25.4) # base graphics: bottom, left, top, right
  box <- NULL
  show <- function(v) {
    if (has_ggplot && inherits(v, "ggplot")) {
      pt <- plot_table(v, margins)
      grid::grid.newpage(); grid::grid.draw(pt$g)
      box <<- pt$box
    } else print(v)
  }
  run_file <- function(file) {
    if (!file.exists(file)) return(invisible())
    exprs <- parse(text = readLines(file, warn = FALSE, encoding = "UTF-8"))
    for (e in exprs) { v <- withVisible(eval(e, env)); if (v$visible) show(v$value) }
  }
  msgs <- character()
  err <- NULL
  printed <- tryCatch({
    capture.output(withCallingHandlers({
      tryCatch(run_file(file.path(dir, "prelude.R")), error = function(e) stop(paste("In the shared plot code:", conditionMessage(e)), call. = FALSE))
      run_file(file.path(dir, "code.R"))
      if (is.null(box) && !is.null(dev.list())) { # base graphics: where the plot region sits
        pl <- par("plt"); box <<- c(left = pl[1] * w * 25.4, right = (1 - pl[2]) * w * 25.4, top = (1 - pl[4]) * h * 25.4, bottom = pl[3] * h * 25.4)
      }
    }, message = function(m) { msgs <<- c(msgs, conditionMessage(m)); invokeRestart("muffleMessage") },
       warning = function(wn) { msgs <<- c(msgs, paste("Warning:", conditionMessage(wn))); invokeRestart("muffleWarning") }))
  }, error = function(e) { err <<- conditionMessage(e); character() })
  if (dev %in% dev.list()) dev.off(dev)
  writeLines(c(printed, msgs), file.path(dir, "log.txt"))
  if (!is.null(box)) writeLines(sprintf('{"left":%.3f,"right":%.3f,"top":%.3f,"bottom":%.3f}', box[["left"]], box[["right"]], box[["top"]], box[["bottom"]]), file.path(dir, "axes.json"))
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

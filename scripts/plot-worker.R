# SciCanvas plot worker (R). SciCanvas starts it once and keeps it running, so ggplot2 and the graphics device
# load once and each plot renders in a fraction of a second.
#
# Protocol: one request per line on stdin, "<id>\t<folder>". The folder holds code.R, params.dcf, data.tsv
# (name<TAB>path lines) and, optionally, prelude.R (the figure's shared plot code, run first). The worker writes
# out.svg, axes.json (where the panels sit), log.txt and, on failure, error.txt into the folder, then prints
# "DONE <id>".
#
# params.dcf: width / height (inches, the size the plot PRINTS at), fontsize, ticksize, labelsize, titlesize,
# legendsize (pt), family, palette (#rrggbb,...), margins (left,right,top,bottom in mm; empty = automatic),
# axislw, linelw, markersize (pt), rasterize (ggplot point layers with more rows than this become a 600-dpi image,
# with ggrastr; 0 = never), xlim / ylim (lo,hi: axis ranges matched across panels). The worker also writes
# ranges.json (the first panel's ranges and scales).
#
# The code runs with: data (a named list of file paths), read(name) (a data file as a data frame: CSV, TSV; Excel
# with readxl), PALETTE (also ggplot2's and base R's default colours), WIDTH and HEIGHT (in), FONT_SIZE and the
# other sizes (pt), and helpers sc_stars(p), sc_bracket(x1, x2, y, label) and sc_n_labels(x, n) (ggplot layers).
# Every value the code leaves visible is printed, as at the console, so a ggplot draws itself.
# With svglite installed, text stays text in the SVG and can be edited in SciCanvas; R's built-in svg() device
# (which needs XQuartz on a Mac) turns text into shapes.
has_svglite <- requireNamespace("svglite", quietly = TRUE)
has_ggplot <- requireNamespace("ggplot2", quietly = TRUE)
if (has_ggplot) suppressPackageStartupMessages(library(ggplot2))

num <- function(p, k, default) if (k %in% colnames(p) && nzchar(p[1, k])) as.numeric(p[1, k]) else default
PT <- 72.27 / 25.4 # ggplot2's .pt: sizes in mm × PT = points
sc_stars <- function(p) ifelse(p < 1e-4, "****", ifelse(p < 1e-3, "***", ifelse(p < 0.01, "**", ifelse(p < 0.05, "*", "ns"))))
sc_bracket <- function(x1, x2, y, label = "*", h = NULL, size = NULL, linewidth = NULL) {
  h <- if (is.null(h)) abs(y) * 0.04 + 1e-9 else h
  list(annotate("segment", x = c(x1, x1, x2), xend = c(x1, x2, x2), y = c(y, y + h, y + h), yend = c(y + h, y + h, y),
                linewidth = if (is.null(linewidth)) getOption("sc.axislw", 0.8) / PT else linewidth),
       annotate("text", x = (x1 + x2) / 2, y = y + h * 1.2, label = label, vjust = 0, size = (if (is.null(size)) getOption("sc.fontsize", 7) else size) / PT))
}
sc_n_labels <- function(x, n, y = -Inf, fmt = "n = %s", size = NULL)
  annotate("text", x = x, y = y, label = sprintf(fmt, n), vjust = -0.4, size = (if (is.null(size)) getOption("sc.ticksize", 6) else size) / PT)

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
  axislw <- num(p, "axislw", 0.8); linelw <- num(p, "linelw", 1.4); marker <- num(p, "markersize", 4); raster <- num(p, "rasterize", 0)
  lim <- function(k) if (k %in% colnames(p) && nzchar(p[1, k])) as.numeric(strsplit(p[1, k], ",", fixed = TRUE)[[1]]) else NULL
  xlim <- lim("xlim"); ylim <- lim("ylim")
  options(sc.axislw = axislw, sc.fontsize = fs, sc.ticksize = ts)
  margins <- if ("margins" %in% colnames(p) && nzchar(p[1, "margins"])) as.numeric(strsplit(p[1, "margins"], ",", fixed = TRUE)[[1]]) else numeric()
  dfile <- file.path(dir, "data.tsv")
  paths <- if (file.exists(dfile) && file.info(dfile)$size > 0) read.delim(dfile, header = FALSE, stringsAsFactors = FALSE, quote = "", col.names = c("name", "path")) else data.frame(name = character(), path = character())
  data <- setNames(as.list(paths$path), paths$name)
  env <- new.env(parent = globalenv())
  env$data <- data
  env$PALETTE <- pal; env$WIDTH <- w; env$HEIGHT <- h; env$FONT_SIZE <- fs
  env$sc_stars <- sc_stars; env$sc_bracket <- sc_bracket; env$sc_n_labels <- sc_n_labels
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
    axis.line = element_line(linewidth = axislw / PT), axis.ticks = element_line(linewidth = axislw / PT),
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
  if (has_ggplot) { # line and point sizes from the figure's style (set every run: the worker is shared)
    for (g in c("line", "path", "step", "smooth", "segment", "hline", "vline", "abline")) try(update_geom_defaults(g, list(linewidth = linelw / PT)), silent = TRUE)
    try(update_geom_defaults("point", list(size = marker / PT)), silent = TRUE)
  }
  par(lwd = axislw / 0.75) # base graphics: lwd 1 = 0.75 pt
  if (length(margins) == 4) par(mai = margins[c(4, 1, 3, 2)] / 25.4) # base graphics: bottom, left, top, right
  box <- NULL; ranges <- NULL
  inv <- function(sc, r) { tr <- tryCatch(sc$get_transformation(), error = function(e) sc$trans); if (is.null(tr) || !is.function(tr$inverse)) r else tr$inverse(r) }
  scale_name <- function(sc) { tr <- tryCatch(sc$get_transformation(), error = function(e) sc$trans); if (is.null(tr) || is.null(tr$name) || tr$name == "identity") "linear" else if (grepl("log", tr$name)) "log" else tr$name }
  show <- function(v) {
    if (has_ggplot && inherits(v, "ggplot")) {
      if (!is.null(xlim) || !is.null(ylim)) v <- v + coord_cartesian(xlim = xlim, ylim = ylim, expand = FALSE)
      if (raster > 0 && requireNamespace("ggrastr", quietly = TRUE)) {
        built <- ggplot2::ggplot_build(v)
        for (i in seq_along(v$layers)) if (inherits(v$layers[[i]]$geom, "GeomPoint") && nrow(built$data[[i]]) > raster) v$layers[[i]] <- ggrastr::rasterise(v$layers[[i]], dpi = 600)
      }
      gb <- tryCatch(ggplot2::ggplot_build(v), error = function(e) NULL)
      if (!is.null(gb)) {
        pp <- gb$layout$panel_params[[1]]; sx <- gb$layout$panel_scales_x[[1]]; sy <- gb$layout$panel_scales_y[[1]]
        ranges <<- list(x = inv(sx, pp$x.range), y = inv(sy, pp$y.range), xscale = scale_name(sx), yscale = scale_name(sy))
      }
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
      if (is.null(box) && !is.null(dev.list())) { # base graphics: where the plot region sits, and its ranges
        u <- par("usr"); ranges <<- list(x = if (par("xlog")) 10^u[1:2] else u[1:2], y = if (par("ylog")) 10^u[3:4] else u[3:4], xscale = if (par("xlog")) "log" else "linear", yscale = if (par("ylog")) "log" else "linear")
        pl <- par("plt"); box <<- c(left = pl[1] * w * 25.4, right = (1 - pl[2]) * w * 25.4, top = (1 - pl[4]) * h * 25.4, bottom = pl[3] * h * 25.4)
      }
    }, message = function(m) { msgs <<- c(msgs, conditionMessage(m)); invokeRestart("muffleMessage") },
       warning = function(wn) { msgs <<- c(msgs, paste("Warning:", conditionMessage(wn))); invokeRestart("muffleWarning") }))
  }, error = function(e) { err <<- conditionMessage(e); character() })
  if (dev %in% dev.list()) dev.off(dev)
  writeLines(c(printed, msgs), file.path(dir, "log.txt"))
  if (!is.null(box)) writeLines(sprintf('{"left":%.3f,"right":%.3f,"top":%.3f,"bottom":%.3f}', box[["left"]], box[["right"]], box[["top"]], box[["bottom"]]), file.path(dir, "axes.json"))
  if (!is.null(ranges)) writeLines(sprintf('{"x":[%.10g,%.10g],"y":[%.10g,%.10g],"xscale":"%s","yscale":"%s"}', ranges$x[1], ranges$x[2], ranges$y[1], ranges$y[2], ranges$xscale, ranges$yscale), file.path(dir, "ranges.json"))
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

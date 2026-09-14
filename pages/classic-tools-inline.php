<?php
/**
 * Inline version of the complete sector calculators.
 *
 * The source document is kept as the reference for the calculator logic and
 * labels, but is rendered inside the dashboard DOM rather than in an iframe.
 * Its styles and the few globals that overlap with the dashboard are isolated
 * before output.
 */
$sourcePath = __DIR__ . '/../attached_assets/index_1789370030522.html';
$source = is_file($sourcePath) ? file_get_contents($sourcePath) : false;

if (!is_string($source)) {
    echo '<div class="alert alert-danger">تعذر تحميل أدوات التسعير حالياً.</div>';
    return;
}

$sourceCss = '';
if (preg_match('/<style\b[^>]*>(.*?)<\/style>/is', $source, $styleMatch)) {
    $sourceCss = $styleMatch[1];
}

if (preg_match('/<body\b[^>]*>(.*?)<\/body>/is', $source, $bodyMatch)) {
    $sourceBody = $bodyMatch[1];
} else {
    $sourceBody = $source;
}

/*
 * The original file has a few names that also exist in dashboard app.js.
 * Rename only the original calculator references so inline onclick handlers
 * continue to resolve to the correct implementation.
 */
$renames = [
    'function openTool(' => 'function classicOpenTool(',
    'openTool('          => 'classicOpenTool(',
    'function selectField(' => 'function classicSelectField(',
    'selectField('       => 'classicSelectField(',
    'function calcPkg('  => 'function classicCalcPkg(',
    'calcPkg('           => 'classicCalcPkg(',
    'function fmt('      => 'function classicFmt(',
    'fmt('               => 'classicFmt(',
];
$sourceBody = str_replace(array_keys($renames), array_values($renames), $sourceBody);

/*
 * The reference page uses decorative emoji heavily. Keep the calculator
 * labels and instructions, but remove emoji from the embedded version so the
 * dashboard uses its formal icon language consistently.
 */
$sourceBody = preg_replace(
    '/[\x{1F000}-\x{1FAFF}\x{2300}-\x{23FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}\x{FE0E}\x{FE0F}\x{200D}]/u',
    '',
    $sourceBody
) ?? $sourceBody;
$sourceBody = str_replace(
    ['<span class="ftick"></span>', '<span class="stk"></span>'],
    ['<span class="ftick">✓</span>', '<span class="stk">✓</span>'],
    $sourceBody
);

/*
 * Scope the legacy stylesheet to this component. @scope is supported by the
 * Chromium runtime used by the Replit preview and prevents selectors such as
 * .card, .tabs and .f from changing the rest of the dashboard.
 */
$scopedCss = str_replace(':root{', '#integrated-tools{', $sourceCss);
$scopedCss = preg_replace('/(?<![A-Za-z0-9_-])body\s*\{/', '#integrated-tools{', $scopedCss) ?? $scopedCss;
$scopedCss = preg_replace('/(?<![A-Za-z0-9_-])body\s+/', '#integrated-tools ', $scopedCss) ?? $scopedCss;

?>
<style id="integrated-tools-source-style">
@scope (#integrated-tools) {
<?= $scopedCss ?>
}

#integrated-tools {
  --bg:#F8F5ED; --surface:#EDE9DF; --card:#FFFFFF; --border:#D5CEC0;
  --gold:#C9A741; --gold-light:#A8882C; --gold-dim:#FAF3DE;
  --text:#1A2B20; --muted:#6B7C73; --soft:#2D4036;
  --green:#2E8B57; --blue:#2471A3; --red:#C0392B; --purple:#6D5AA8;
  font-family:'BritishCouncil','Hurme','Arial',sans-serif;
  color:var(--text);
  background:var(--bg);
  border-radius:var(--r-lg);
  overflow:hidden;
}
#integrated-tools #platform-home {
  min-height:0!important;
  padding:0 0 24px!important;
  background:var(--bg)!important;
}
#integrated-tools .platform-header,
#integrated-tools .site-footer,
#integrated-tools #about-modal,
#integrated-tools #contact-modal,
#integrated-tools .feedback-fab {
  display:none!important;
}
#integrated-tools .tools-section {
  max-width:none!important;
  padding:20px 0!important;
}
#integrated-tools .tools-title {
  color:var(--text)!important;
  font-family:inherit!important;
}
#integrated-tools .tool-card,
#integrated-tools .tool-card.gold,
#integrated-tools .tool-card.blue,
#integrated-tools .tool-card.green {
  background:var(--card)!important;
  border-color:var(--line)!important;
  box-shadow:none!important;
}
#integrated-tools .tool-card:hover,
#integrated-tools .tool-card.gold:hover,
#integrated-tools .tool-card.blue:hover,
#integrated-tools .tool-card.green:hover {
  border-color:var(--green)!important;
  box-shadow:var(--sh)!important;
  transform:translateY(-1px)!important;
}
#integrated-tools .tool-name,
#integrated-tools .tool-card.gold .tool-name,
#integrated-tools .tool-card.blue .tool-name,
#integrated-tools .tool-card.green .tool-name {
  color:var(--text)!important;
}
#integrated-tools .tool-desc { color:var(--muted)!important; }
#integrated-tools .tool-tag {
  background:var(--surface)!important;
  color:var(--muted)!important;
  border-color:var(--line)!important;
}
#integrated-tools .tool-icon { background:var(--p-l)!important; }
#integrated-tools .tool-arrow { color:var(--green)!important; }
#integrated-tools .back-bar {
  background:var(--card)!important;
  border-color:var(--line)!important;
}
#integrated-tools .back-btn { color:var(--green)!important; }
#integrated-tools .tab.active {
  color:var(--green)!important;
  border-bottom-color:var(--gold)!important;
}
#integrated-tools .card,
#integrated-tools .log-item {
  background:var(--card)!important;
  border-color:var(--line)!important;
}
#integrated-tools .f input,
#integrated-tools .f select,
#integrated-tools .pricing-method-wrap select {
  background:var(--surface)!important;
  border-color:var(--line)!important;
  color:var(--text)!important;
}
#integrated-tools .f input:focus,
#integrated-tools .f select:focus,
#integrated-tools .pricing-method-wrap select:focus {
  border-color:var(--green)!important;
}
#integrated-tools .save-btn {
  background:var(--green)!important;
  color:#fff!important;
}
#integrated-tools .print-btn {
  background:rgba(46,139,87,.08)!important;
  color:var(--green)!important;
  border-color:rgba(46,139,87,.25)!important;
}
#integrated-tools .tools-section > .tool-card .tool-icon {
  font-size:0!important;
  font-weight:800!important;
  letter-spacing:.02em;
}
#integrated-tools .tools-section > .tool-card .tool-icon::before {
  font-size:14px;
  content:'';
}
#integrated-tools .tools-section > .tool-card:nth-of-type(1) .tool-icon::before { content:'01'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(2) .tool-icon::before { content:'02'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(3) .tool-icon::before { content:'03'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(4) .tool-icon::before { content:'04'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(5) .tool-icon::before { content:'05'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(6) .tool-icon::before { content:'06'; }
#integrated-tools .tools-section > .tool-card:nth-of-type(7) .tool-icon::before { content:'07'; }
</style>

<div id="integrated-tools" class="integrated-tools">
  <?= $sourceBody ?>
</div>
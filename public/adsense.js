// Runs once per page, independently of search, map and catalogue requests.
const unit = document.querySelector('.network-ad .adsbygoogle');
if (unit) {
  const section = unit.closest('.network-ad');
  const fallback = document.querySelector('[data-banner-slot="explorer-bottom"]');
  const sync = () => {
    const filled = unit.dataset.adStatus === 'filled';
    section.classList.toggle('ad-empty', ['unfilled','unfill-optimized'].includes(unit.dataset.adStatus));
    // CSS owns fallback visibility so the asynchronous banner loader cannot undo it.
    fallback?.classList.toggle('replaced-by-network-ad', filled);
  };
  new MutationObserver(sync).observe(unit, { attributes:true, attributeFilter:['data-ad-status'] });
  sync();
  // Blocked scripts may never set an ad status; leave the enquiry card available.
  setTimeout(() => { if (!unit.dataset.adStatus) section.classList.add('ad-empty'); }, 8000);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
  catch { section.classList.add('ad-empty'); }
}

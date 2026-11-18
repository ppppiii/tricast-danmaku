// Official Douyin 214 system inline emojis & text tokenizer for TriCast Danmaku.

const DOUYIN_EMOJI_HOST_RE = /(?:douyinpic\.com|byteimg\.com|bytednsdoc\.com|snssdk\.com|toutiaoimg\.com)$/i;

function defaultValidateUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return '';
  try {
    const u = new URL(trimmed.startsWith('//') ? 'https:' + trimmed : trimmed);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return '';
    if (!DOUYIN_EMOJI_HOST_RE.test(u.hostname)) return '';
    u.protocol = 'https:';
    return u.href;
  } catch {
    return '';
  }
}

export const DEFAULT_DOUYIN_EMOJIS = Object.freeze({
  "[微笑]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/54a0f69dc150401a85ba8c20c1a05db1?lk3s=343af0a2&x-expires=2110381200&x-signature=Zrda6vr1R81a33sClu3PKqwKCbI%3D&from=876277922",
  "[色]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/27a1d35dea9748ac8c14f6c2c9829965?lk3s=343af0a2&x-expires=2110381200&x-signature=bGW1WFrmPvOSOLgRWxA3G47ZrLE%3D&from=876277922",
  "[发呆]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/88ebe7b3f2e24729aa4de3ff33ae5731?lk3s=343af0a2&x-expires=2110381200&x-signature=v976L9Phr12o7BGKGYZcZcWL8TQ%3D&from=876277922",
  "[酷拽]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/0fac43466165409a805b3b6e3547ccef?lk3s=343af0a2&x-expires=2110381200&x-signature=etsnwsS%2BgSRuECLcmWo0gh5SZq8%3D&from=876277922",
  "[抠鼻]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/accde8fa9fe04c5e8fa3f25d1ddb5584?lk3s=343af0a2&x-expires=2110381200&x-signature=KEdgyD49aGSASe5jGdrRy50hRdU%3D&from=876277922",
  "[流泪]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/2d8dc1e2bb8a417cab4130df2d10e478?lk3s=343af0a2&x-expires=2110381200&x-signature=496N%2BKzTJE3nlfyvZesPocqWVh0%3D&from=876277922",
  "[捂脸]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/357ac72b9b6449f7bd3005ff66678822?lk3s=343af0a2&x-expires=2110381200&x-signature=R02h99vTo912Qw2pj3sDO9NFnao%3D&from=876277922",
  "[发怒]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/156352b6879b4b5f96fd80434ff72c8e?lk3s=343af0a2&x-expires=2110381200&x-signature=7c%2BKTTaHMb6AeyaDhIWab9LhNf0%3D&from=876277922",
  "[呲牙]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/17bc9c4501784279b8e7d886832b0f28?lk3s=343af0a2&x-expires=2110381200&x-signature=gogM5gNKBZb4f7qnCIMqPjyy2nA%3D&from=876277922",
  "[尬笑]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/96744c9a302345d1b14d7e0a9951c7b9?lk3s=343af0a2&x-expires=2110381200&x-signature=FfdOv80hANtzxzsW%2BtdEThCpfDc%3D&from=876277922",
  "[害羞]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d05cee2608fe4f998fef3f90de9466df?lk3s=343af0a2&x-expires=2110381200&x-signature=7%2FRVsiB%2F%2BsSEpeTAOfJgF0lLOic%3D&from=876277922",
  "[调皮]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/a921fa28653043c1bbf162abe017c99a?lk3s=343af0a2&x-expires=2110381200&x-signature=C2FhOBSOOKkV7v%2B55%2Bn0M%2Fvbip0%3D&from=876277922",
  "[舔屏]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d99bd102d422484188b98e8889c0c330?lk3s=343af0a2&x-expires=2110381200&x-signature=LclqoCyjlkVsHuX2qdofljdHw90%3D&from=876277922",
  "[看]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/87c2ae45679c4cc4a35bd7182fd76935?lk3s=343af0a2&x-expires=2110381200&x-signature=BcGRDZnQhMt9F3bIU%2Bim6lbQ3Ag%3D&from=876277922",
  "[爱心]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/427b632213784532a4076c3b0ab269fb?lk3s=343af0a2&x-expires=2110381200&x-signature=NOJmRwQ0bLeenXzB%2FoyAD8xGczw%3D&from=876277922",
  "[比心]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/75b4e7e2405447959578f54d87811e35?lk3s=343af0a2&x-expires=2110381200&x-signature=zG6tY8kYWH8vH2wPFHnvBhD0MXU%3D&from=876277922",
  "[赞]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/1a09f79a0e7e433eb2bc143c9f026d65?lk3s=343af0a2&x-expires=2110381200&x-signature=r61e63fga3go4DFJBU5GL%2Ba3M1k%3D&from=876277922",
  "[鼓掌]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/15d1258bec8e4c9ea9687f1134bd5f65?lk3s=343af0a2&x-expires=2110381200&x-signature=tz%2FzzTN3PL5Wr%2F95eQLSznp74y0%3D&from=876277922",
  "[感谢]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/fabab8b14ec64f669283287a4b7041cb?lk3s=343af0a2&x-expires=2110381200&x-signature=yhqowqVCWY4ybgQcN7izGmrcuH0%3D&from=876277922",
  "[抱抱你]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/299f50b8f96640d5b349cc6cb4a76030?lk3s=343af0a2&x-expires=2110381200&x-signature=%2FBRla9Y2o9TruYhFZamkA%2FuF8NU%3D&from=876277922",
  "[玫瑰]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/683fcd46faf148af99c90e36ccc4c013?lk3s=343af0a2&x-expires=2110381200&x-signature=ApKcqwIEMa8%2FvLffoF30PDpS9kY%3D&from=876277922",
  "[尴尬流汗]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/160eca1320584e2e87122e7d7ba72a53?lk3s=343af0a2&x-expires=2110381200&x-signature=9g8Q4RRSAjqpKGQwHWkIFmr1ET8%3D&from=876277922",
  "[戳手手]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/4268c0b885ec4eae8e95dab8635ca215?lk3s=343af0a2&x-expires=2110381200&x-signature=nNqUgTYa4MwWXjYQxyRn1CI%2Fw08%3D&from=876277922",
  "[星星眼]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/007064f99b694041a1890e52ff8c5768?lk3s=343af0a2&x-expires=2110381200&x-signature=rh7TpxTD1V8uc8P%2F417fErMsLUc%3D&from=876277922",
  "[杀马特]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ed5fb68598cf4741b3e7f2affd825650?lk3s=343af0a2&x-expires=2110381200&x-signature=Ksois3usGRbdB3TiZFB3ydyPwfI%3D&from=876277922",
  "[黄脸干杯]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/a0a1e35991334532b142572d93f38ac5?lk3s=343af0a2&x-expires=2110381200&x-signature=8s0l8p4CeANLIEcudt3cw6LBmUo%3D&from=876277922",
  "[抱紧自己]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c0cf6b7d6a144b68b6045fd92bfe9fe2?lk3s=343af0a2&x-expires=2110381200&x-signature=66PomwUG96UqPPksG%2B9GZUJZaVk%3D&from=876277922",
  "[拜拜]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/36cf73734e9c49d48b3e9a5bbe2affaf?lk3s=343af0a2&x-expires=2110381200&x-signature=HnlER5bQVrqFejLowpKczCYIT8E%3D&from=876277922",
  "[热化了]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/2cffc18234074d20acb0c6334c76f04a?lk3s=343af0a2&x-expires=2110381200&x-signature=DAGqpgG8Xt8qAfaHecR5V5x3424%3D&from=876277922",
  "[黄脸祈祷]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/3f67722d0c694372b7023deda01bd91c?lk3s=343af0a2&x-expires=2110381200&x-signature=xmg4qS1WoyExRha008pzEC7r%2B3c%3D&from=876277922",
  "[懵]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/dbd68a1183b344648759f5971cbc6238?lk3s=343af0a2&x-expires=2110381200&x-signature=uTjTVkZql9LU3d7ORnJTETNnM2c%3D&from=876277922",
  "[举手]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/3c34da0d65db47c6933e6b66cc17e5aa?lk3s=343af0a2&x-expires=2110381200&x-signature=XtWoDye9%2FwtB3zqTC6qPHyNpuuU%3D&from=876277922",
  "[加功德]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/49b00fcf022d4c36ba86bb19c7358ec6?lk3s=343af0a2&x-expires=2110381200&x-signature=xJhkQ4NE6GNO4bYvw%2BBOkqlR7gs%3D&from=876277922",
  "[摊手]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/6ffc70d8850b4e5eb6c7a5aa9e7b1782?lk3s=343af0a2&x-expires=2110381200&x-signature=9QYABlQn92T7CPQHUQaP1n4%2By%2Bs%3D&from=876277922",
  "[无语流汗]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/67f5a31e2895499dbfff97ff81efb0f8?lk3s=343af0a2&x-expires=2110381200&x-signature=pj1d5Hj85JBTK7wr9BSwe1PwiUA%3D&from=876277922",
  "[续火花吧]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/1da1cd2598ba48a78cf07dc7eea09338?lk3s=343af0a2&x-expires=2110381200&x-signature=8liTHCGE6ZwlZsQGgTVSTLUUKU0%3D&from=876277922",
  "[点火]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/3bb9834bd95d4a5ba305ca2d788bd62e?lk3s=343af0a2&x-expires=2110381200&x-signature=k9JiBg0Q3sZpWB8Xp2nysB5Z37A%3D&from=876277922",
  "[哭哭]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c380b32e707b43a2967ee7b492771c0f?lk3s=343af0a2&x-expires=2110381200&x-signature=OX6KElVa597iPJgp%2B9WQOm2kc5A%3D&from=876277922",
  "[吐舌小狗]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e4fb11ce2e2b432483ef58e058be6e0d?lk3s=343af0a2&x-expires=2110381200&x-signature=6OzIZLk0i3bepMjC2tLT%2BHk6bCE%3D&from=876277922",
  "[送花]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ff736698b03446d19ae05cbd6cc45256?lk3s=343af0a2&x-expires=2110381200&x-signature=Pu2doeq3XXZl2PkORIqIwW8YuLo%3D&from=876277922",
  "[爱心手]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/7f50f1d4d0c74571b1a60eba9b41a4d7?lk3s=343af0a2&x-expires=2110381200&x-signature=uvCQTo%2FFGNc0tHeGyptkz20ByL8%3D&from=876277922",
  "[贴贴]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c3dee11223784da3a2ed524d94bb2ce8?lk3s=343af0a2&x-expires=2110381200&x-signature=sKQ2BhCy5GoBWBrA1trlgEeaFQg%3D&from=876277922",
  "[灵机一动]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/801127f060844405b0f5e00bd01cb8ba?lk3s=343af0a2&x-expires=2110381200&x-signature=ExX0HzkvP2kGADxhvYy4PHrDXzM%3D&from=876277922",
  "[耶]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/f00c1c8054ff41768994256236d305b1?lk3s=343af0a2&x-expires=2110381200&x-signature=hNOFgdSqVeCzTVmmMx9KI70%2BloI%3D&from=876277922",
  "[打脸]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d00f39c3d5d54144a395ad4d7f8d4489?lk3s=343af0a2&x-expires=2110381200&x-signature=wJkoxtzDci3X7vDU0lVJG8DPvow%3D&from=876277922",
  "[大笑]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ce993ad237174993a2ed8de550a63772?lk3s=343af0a2&x-expires=2110381200&x-signature=JJ7G1o0xCkVqu5JRTKT1XrTDShA%3D&from=876277922",
  "[机智]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ca113e21412d4609ae38032b3befddb9?lk3s=343af0a2&x-expires=2110381200&x-signature=4cnnf3aRPmu6RhrKhOVC4AwlDkc%3D&from=876277922",
  "[送心]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/72211d3eadb64791a967f43ab340a55a?lk3s=343af0a2&x-expires=2110381200&x-signature=9x36KUmLcertFNlJpLEzRO0hv0Y%3D&from=876277922",
  "[666]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/11a083f1a213461f859370ccbce074df?lk3s=343af0a2&x-expires=2110381200&x-signature=MCIGn%2FVoHjVtGC1%2F3peuK3xNCso%3D&from=876277922",
  "[闭嘴]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d32f14b5edfd4489a4ea736a8ad39741?lk3s=343af0a2&x-expires=2110381200&x-signature=lgRH3YcrkGWWQ5Tah9USQqSYzo4%3D&from=876277922",
  "[来看我]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/27059cc0891649a8b2b0860b5b08f540?lk3s=343af0a2&x-expires=2110381200&x-signature=nluB%2BBr36avD70vRwWKq%2B6xS5BU%3D&from=876277922",
  "[一起加油]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/632214f7625a41ec8b558961929153f8?lk3s=343af0a2&x-expires=2110381200&x-signature=3ChnfEP%2B%2FwnQ2%2FVv7ppNMO1lWDU%3D&from=876277922",
  "[哈欠]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/8ef4e9f6ef36449dab4c5ecde36f7d6b?lk3s=343af0a2&x-expires=2110381200&x-signature=lOlDDfuhB2tzhIvblSTtg8JfZKw%3D&from=876277922",
  "[震惊]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/7181d20e807f4c5787f484531d1d8468?lk3s=343af0a2&x-expires=2110381200&x-signature=lN4RFuTuMD69FnovvO1C7%2FUfWlg%3D&from=876277922",
  "[晕]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/2af8cb49d2854197b7dd9b87f9dd106b?lk3s=343af0a2&x-expires=2110381200&x-signature=Pjq0Et%2F9IZuElnYuyD9nkmakcNU%3D&from=876277922",
  "[衰]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/aa5c7f4a1d0c430a94934287cacd3c17?lk3s=343af0a2&x-expires=2110381200&x-signature=UBifcu8hP%2FWBI2sWO6TAkEOqgiY%3D&from=876277922",
  "[困]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/23cdce75a6d64bd8bb7ff87037db1be0?lk3s=343af0a2&x-expires=2110381200&x-signature=UJEz%2BuQ3RcB07Q8JNIsfytKy9pw%3D&from=876277922",
  "[疑问]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/9ea78ef420fa4bf1b7e544a01e75b830?lk3s=343af0a2&x-expires=2110381200&x-signature=DW3IcKEx%2FBT0pjGoXmE9iI7qE88%3D&from=876277922",
  "[泣不成声]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/7fb67c323a0d410ea5573d4825e347eb?lk3s=343af0a2&x-expires=2110381200&x-signature=4%2F%2F0B43HAbuphMppfCHGVJMDcfQ%3D&from=876277922",
  "[小鼓掌]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/8f19f0db21324c7f9ce7b2dca984a309?lk3s=343af0a2&x-expires=2110381200&x-signature=xmwRKbNxhuoq8A4%2BRl6sKWyS%2F2E%3D&from=876277922",
  "[大金牙]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/b94090121f3e4549a3bee84e00515ed0?lk3s=343af0a2&x-expires=2110381200&x-signature=VD%2FALYwKKR%2F2D1B3%2BzZpDkPGe5I%3D&from=876277922",
  "[偷笑]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/817c931baafa4d06a120a8d67973b6f0?lk3s=343af0a2&x-expires=2110381200&x-signature=u8PNIbb8AcpDWrMyN8d1vWEEimY%3D&from=876277922",
  "[石化]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/88746458dcbd47b1aa801e3823e6c9a2?lk3s=343af0a2&x-expires=2110381200&x-signature=s%2Fizmn%2B%2B2YArQRX03db1E0EfQnk%3D&from=876277922",
  "[思考]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c3e345069adf42f58036c349ecc20a00?lk3s=343af0a2&x-expires=2110381200&x-signature=8nuHELZABW9AumwgI8id9nFiG90%3D&from=876277922",
  "[吐血]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/331299e25af844a38800ec75d8dd0a16?lk3s=343af0a2&x-expires=2110381200&x-signature=6nVSLBydMyqif2lhQD0Qy3IMDLo%3D&from=876277922",
  "[可怜]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/1369a30daa7d45d6b3fa5ab241938fd2?lk3s=343af0a2&x-expires=2110381200&x-signature=oSBtqevmdrw93PWizMVRK6rFlhE%3D&from=876277922",
  "[嘘]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/7c02d77ba7b44cfda223941529ccb2e6?lk3s=343af0a2&x-expires=2110381200&x-signature=4mt2%2F%2B%2FG6v7qW4kUjR9TSTKfd8g%3D&from=876277922",
  "[撇嘴]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/784ef77ac9de4e4990a607166856cd38?lk3s=343af0a2&x-expires=2110381200&x-signature=UHt3KYpA4nqbStV4mg0spHDHwH0%3D&from=876277922",
  "[笑哭]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e4f0c86449754bab8ae2cefe6317ceee?lk3s=343af0a2&x-expires=2110381200&x-signature=dWfIxrHZBt316o3A%2BsQTBI%2BEqEs%3D&from=876277922",
  "[奸笑]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/6ac6247beb3a41d9b9e0e982e0225506?lk3s=343af0a2&x-expires=2110381200&x-signature=XYApJ37xYAyp07AgXw0%2B0eVp%2F88%3D&from=876277922",
  "[得意]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/b1b52b6e940a4ef8907819eb8e871c21?lk3s=343af0a2&x-expires=2110381200&x-signature=RZoeTcY2nUdsHllbPDckYxAX7Bg%3D&from=876277922",
  "[憨笑]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/fceeae50c04b4343b44055ba9f9bb1a3?lk3s=343af0a2&x-expires=2110381200&x-signature=RgzB5km9rziAF0mSWTtKB3dxz5c%3D&from=876277922",
  "[坏笑]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/eab59a94674f40358b412586f148aac6?lk3s=343af0a2&x-expires=2110381200&x-signature=taS%2BiS7dU9tq2ck9hIR2nClsSK4%3D&from=876277922",
  "[抓狂]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e7ffd9db28e3455195872ebf666d2c66?lk3s=343af0a2&x-expires=2110381200&x-signature=vYrYskMA3w7%2FsTkKUlbuB%2Bbuh9I%3D&from=876277922",
  "[泪奔]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/20dbe8334dd64d028f943abc2ccde4d9?lk3s=343af0a2&x-expires=2110381200&x-signature=ziCM2tVRceVe1lwSC%2B64w%2BR%2FN6M%3D&from=876277922",
  "[钱]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/9a45bb9c0b8a4963b858846b079cfe2f?lk3s=343af0a2&x-expires=2110381200&x-signature=tzUF12wfW%2FWF3oYPJmJkScQqOLU%3D&from=876277922",
  "[恐惧]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c12d025f50a047c2b064ce5f1a196f94?lk3s=343af0a2&x-expires=2110381200&x-signature=ueWaFyLBWXiLlovZeezrYZow0yw%3D&from=876277922",
  "[愉快]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/62266cefe5fe4422aceaeaeed9072b3b?lk3s=343af0a2&x-expires=2110381200&x-signature=YBTuASISi0eixdEdSpvsXPm5Qw0%3D&from=876277922",
  "[快哭了]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/79df79563eaf424e9eb7a26558236ff7?lk3s=343af0a2&x-expires=2110381200&x-signature=xwsWN3gFqQiucoWUAPZERpA%2FgiY%3D&from=876277922",
  "[翻白眼]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/0e40da06368145848f7585edc937f34e?lk3s=343af0a2&x-expires=2110381200&x-signature=dlcmb3Wom81n9ZmhHO2U013L1i8%3D&from=876277922",
  "[互粉]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/cb46843009fe47808953af2c9ab2fb9a?lk3s=343af0a2&x-expires=2110381200&x-signature=SVGNJlVtBOboxdqm2uhBCpD9MuM%3D&from=876277922",
  "[我想静静]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/95d5d919b99c43f29d2fbc660ec873f0?lk3s=343af0a2&x-expires=2110381200&x-signature=cZt2nCBTOy4rYuuOBVIu00wVx6k%3D&from=876277922",
  "[委屈]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/2f7509f2cbe248889f279d19ea3fd649?lk3s=343af0a2&x-expires=2110381200&x-signature=%2FEPul16wyjsgxdwpRTpU4l9%2FWPo%3D&from=876277922",
  "[鄙视]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/5c13cbb44f334122a9cd7cf4bcc6598e?lk3s=343af0a2&x-expires=2110381200&x-signature=e0q3cWOC%2BPx5y3vnkziydvGq%2FmQ%3D&from=876277922",
  "[飞吻]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/6dcb7560c1c84d45b4abe2cb37ae7afb?lk3s=343af0a2&x-expires=2110381200&x-signature=6ciju4YPgpKZJ5kCdJ50K%2B3hGsg%3D&from=876277922",
  "[再见]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/cae63f89c3eb478f8d1cca893b1b1a0c?lk3s=343af0a2&x-expires=2110381200&x-signature=2jhvnfVr%2F3adj3AqINy7E1r9ZyM%3D&from=876277922",
  "[紫薇别走]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/1d921b6eff48473f872fa7d278d26926?lk3s=343af0a2&x-expires=2110381200&x-signature=aTIi9gCnb8ZF65d4520rf3Won0s%3D&from=876277922",
  "[听歌]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/82bed7a3182b4c6db21ca39417359fa1?lk3s=343af0a2&x-expires=2110381200&x-signature=gCegJ5VPObsoSM6nVlmLNf2Vsic%3D&from=876277922",
  "[求抱抱]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/de99b54c6be24f73a5aaef8366a55e99?lk3s=343af0a2&x-expires=2110381200&x-signature=xtsiLegehLj3FdbvtyzWFn0gKEo%3D&from=876277922",
  "[绝望的凝视]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/19f6a9449e714d85bb393794daaf6d58?lk3s=343af0a2&x-expires=2110381200&x-signature=H59VgYHbMS%2BpKXs4vTkDywSuJ4M%3D&from=876277922",
  "[不失礼貌的微笑]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/b7b842ba92e14fb8a8f328f25db91276?lk3s=343af0a2&x-expires=2110381200&x-signature=uDaFspEaj7J78dz4w3jOmoedA2U%3D&from=876277922",
  "[不看]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/626f19e473d94e95b21b67f098599281?lk3s=343af0a2&x-expires=2110381200&x-signature=aiNa7JoUD%2B389SmInwBpRvGqVEo%3D&from=876277922",
  "[裂开]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e8c40bd4201e4afda065c55688971a2f?lk3s=343af0a2&x-expires=2110381200&x-signature=qaH7eUOLdWxnbmxiwtaeNiXGAGE%3D&from=876277922",
  "[干饭人]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/0b0adfdffaea4c62a73302ae44d67a66?lk3s=343af0a2&x-expires=2110381200&x-signature=wJC%2B%2FeiWPodI8CQRm5mcCOy5nCE%3D&from=876277922",
  "[庆祝]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/9c1325e3650a4a4d96d8e299406d9d68?lk3s=343af0a2&x-expires=2110381200&x-signature=pGCD9XLVvLZUAOzfZxpcqHXiyNM%3D&from=876277922",
  "[吐舌]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e577535321324e68a0cc8fcff1a2f421?lk3s=343af0a2&x-expires=2110381200&x-signature=UDWsARrkwttCJj8%2FhZEuYr%2FJxZY%3D&from=876277922",
  "[呆无辜]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/98c368cc39b74b94bf7923b6d9c479b9?lk3s=343af0a2&x-expires=2110381200&x-signature=r4jUVN7dWaU%2FeXNJGqOpGv8WM4M%3D&from=876277922",
  "[白眼]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/a9d1ba597042412f9275369807147bee?lk3s=343af0a2&x-expires=2110381200&x-signature=pIItmwydDa%2FtKjofI9hw09s2eOU%3D&from=876277922",
  "[猪头]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/4296ea156ee6479e9ad5c1381ec73cca?lk3s=343af0a2&x-expires=2110381200&x-signature=ZS7ApKQ6bZac9kWpjPXPAIjPeZE%3D&from=876277922",
  "[冷漠]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ba1d020f28a749e388fb1d15e52ac4ae?lk3s=343af0a2&x-expires=2110381200&x-signature=ZHWvoiXMoiUCpLSEGDVAuM8gRIU%3D&from=876277922",
  "[暗中观察]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/3cf77301823a4e969cc4c0a04d245f3d?lk3s=343af0a2&x-expires=2110381200&x-signature=Pb44IUhjirGFPgufj2qu%2BpqlmRQ%3D&from=876277922",
  "[二哈]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/2ddc8ae48fae4a4fb3767f666bb79d95?lk3s=343af0a2&x-expires=2110381200&x-signature=AgLwbx04ZO%2FVbxcqaYTUe3T9ZZI%3D&from=876277922",
  "[菜狗]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/62baecf5a0084194ac383d3d199ab597?lk3s=343af0a2&x-expires=2110381200&x-signature=USzY3bWrzd8bkR2lIBHU5pW4%2F2I%3D&from=876277922",
  "[黑脸]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/b96c76ac689f44d09537583ca2357672?lk3s=343af0a2&x-expires=2110381200&x-signature=FoPmPAOF5h99xXb%2BGAP2gBSz5eU%3D&from=876277922",
  "[展开说说]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/30f0c01ef9d24144a8ae05351485fe18?lk3s=343af0a2&x-expires=2110381200&x-signature=7o1e0YoEufBFB2PWDGuMzJQJW6Y%3D&from=876277922",
  "[蜜蜂狗]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d336f83b827b407d872bc48861a44c70?lk3s=343af0a2&x-expires=2110381200&x-signature=17BxmjPneBh%2BwYnyCSohkYLzrAY%3D&from=876277922",
  "[柴犬]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/764a5db2a67242c189f5fdabb1c75648?lk3s=343af0a2&x-expires=2110381200&x-signature=e7akezz0xUIzjxllih8APa7xLB4%3D&from=876277922",
  "[摸头]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/10790e118cbc4d13b48cdc19c1eecb96?lk3s=343af0a2&x-expires=2110381200&x-signature=KuHIrYil9wZudjG8Z3y3VJXcqOo%3D&from=876277922",
  "[皱眉]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d143738426054c9f88657ee97b779643?lk3s=343af0a2&x-expires=2110381200&x-signature=u8PAEGvFzc10w4QryLRDiEBYMQ0%3D&from=876277922",
  "[擦汗]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/0f7be11419c44d1ab158bbafa666101c?lk3s=343af0a2&x-expires=2110381200&x-signature=eifFuxYpIQd%2B5F8BobiXFbkusN8%3D&from=876277922",
  "[红脸]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/15efff0277f74e5b9e2b12c984eac159?lk3s=343af0a2&x-expires=2110381200&x-signature=yyjo%2FIbJX9msHVy2YQokXRFiZj0%3D&from=876277922",
  "[做鬼脸]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e8d099b1dc5b41b0b8535b47747a94f4?lk3s=343af0a2&x-expires=2110381200&x-signature=I6tB%2BpvLiGcNjNbC3i%2BZ64AvPG8%3D&from=876277922",
  "[强]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/0b815bcdb647471b9281e3105d8d6c8e?lk3s=343af0a2&x-expires=2110381200&x-signature=xMEGClOjIZ3zkIW%2BJSzqRPBM2uI%3D&from=876277922",
  "[如花]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/dd44ccdacbe6444a9515bdca3fb56d5f?lk3s=343af0a2&x-expires=2110381200&x-signature=fqxBPhypsp7bGVm9D4Uvvwfc8AY%3D&from=876277922",
  "[吐]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c0157bfb1fc548d097933c039d6952ae?lk3s=343af0a2&x-expires=2110381200&x-signature=bpJDknJmnL233ftgudh4la4r2ic%3D&from=876277922",
  "[惊喜]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e718e4d7913c4bcf9c49560ff96386e9?lk3s=343af0a2&x-expires=2110381200&x-signature=nqZrPu5elOrkySJk%2Bhpo52%2FfEQo%3D&from=876277922",
  "[敲打]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/8067eb30b0d74ad29c15a8c5c7b11230?lk3s=343af0a2&x-expires=2110381200&x-signature=fMjz%2BwCBWWnhgbHhEhPVtT0J63w%3D&from=876277922",
  "[奋斗]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/fb3fb08ab5204f2a83086d782944882d?lk3s=343af0a2&x-expires=2110381200&x-signature=R2j4pLAcDPyPe3Zj%2BV8c4Md4ya0%3D&from=876277922",
  "[吐彩虹]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/0878b09fe3fa4d4a8f47c63748cf7762?lk3s=343af0a2&x-expires=2110381200&x-signature=pTXsCmp9x99%2FeyG%2Fy1zit8by4r8%3D&from=876277922",
  "[大哭]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/53246f7d51fa42e5b48b99c8074ca607?lk3s=343af0a2&x-expires=2110381200&x-signature=ecubsWzDrx7x1UFITvR6R%2FlGWvg%3D&from=876277922",
  "[嘿哈]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/af4e2e63b51f4d66a060ff0a42d0098b?lk3s=343af0a2&x-expires=2110381200&x-signature=EwFa1VDCZRnDBU%2Bl1XCfPxagiHA%3D&from=876277922",
  "[惊恐]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/fd2f5745edbd4dadb6014096965d1c6c?lk3s=343af0a2&x-expires=2110381200&x-signature=2%2F7bzpnh7HN4Oata9nflF7XBU7Q%3D&from=876277922",
  "[囧]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/4cd5a1e2c43341a9b4ac95ace6ed913e?lk3s=343af0a2&x-expires=2110381200&x-signature=ch%2Fq%2FOE33bYTmPYAB%2Ba4mYiOQtA%3D&from=876277922",
  "[难过]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/697dc91cd453495d988628058582fed3?lk3s=343af0a2&x-expires=2110381200&x-signature=CRIasRM3ttapssNYBJi0sAg%2FS%2Fw%3D&from=876277922",
  "[斜眼]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/63a00ad586eb4f9e81369a7e693b778b?lk3s=343af0a2&x-expires=2110381200&x-signature=G1ClER%2BH11dZ1d8MpVS9CRtRvtk%3D&from=876277922",
  "[阴险]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/628bc8956092489399730d0c8178de5b?lk3s=343af0a2&x-expires=2110381200&x-signature=cjDw9vbzLjYnXzkQNiBwNsTMCLE%3D&from=876277922",
  "[悠闲]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/989818a338bd4d718f0afc47f7c76a4c?lk3s=343af0a2&x-expires=2110381200&x-signature=0UkrvOl4kQGMMU1LNYSQKG4xNYs%3D&from=876277922",
  "[咒骂]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/44802ec1a8bd4ff2aac38cfcf97201cb?lk3s=343af0a2&x-expires=2110381200&x-signature=roDYhjlOiJ7%2BwF37Zq20RjUAmgM%3D&from=876277922",
  "[吃瓜群众]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/2e2059714acb489483735cbe63ff7dbc?lk3s=343af0a2&x-expires=2110381200&x-signature=o2%2FLgBZYzAnwpleYbW5hwrT5aeg%3D&from=876277922",
  "[绿帽子]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d23e058bab744349ac636c45e9a3687f?lk3s=343af0a2&x-expires=2110381200&x-signature=oALRooi4%2FMMYthQGwn8seV4pF7Q%3D&from=876277922",
  "[敢怒不敢言]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/38b34096e69c41119b8d50cfd3a66882?lk3s=343af0a2&x-expires=2110381200&x-signature=0adri0u%2BVdH3VTlB2%2BSax1bigws%3D&from=876277922",
  "[求求了]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/3b99deef770044d79182c18a854f4f27?lk3s=343af0a2&x-expires=2110381200&x-signature=IfdWHNnkiFtddO3b2MrhnldoLqo%3D&from=876277922",
  "[眼含热泪]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/daf0e01ed3404b8e88898f690533bb76?lk3s=343af0a2&x-expires=2110381200&x-signature=lE5g7avFF2WFwmoFlZZ1AwE7waA%3D&from=876277922",
  "[叹气]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d7c541c323de4272acf862f77bb8b8a2?lk3s=343af0a2&x-expires=2110381200&x-signature=3wEpCjs%2B6JjEiN4t2Ur0wpl5jVg%3D&from=876277922",
  "[好开心]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/9b931359a63a42f693fdabe5934e95a9?lk3s=343af0a2&x-expires=2110381200&x-signature=PRyNnssYKh9rVShTiAT5CTnWgbE%3D&from=876277922",
  "[不是吧]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/a854fc87af894fddb1e36f97867c8169?lk3s=343af0a2&x-expires=2110381200&x-signature=z1R01Sd%2F7tmDuEGEW9sf9vnWUEs%3D&from=876277922",
  "[鞠躬]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/93ffc02b07174d15a0d602b7a4cbb87f?lk3s=343af0a2&x-expires=2110381200&x-signature=MFTXvIkVlwjk6fV1FEgOQOTF4KU%3D&from=876277922",
  "[躺平]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/25625ce0678448fc9c556bd1ebcf638c?lk3s=343af0a2&x-expires=2110381200&x-signature=WyBUltsp9YMSDPNxjVWDODjDhLA%3D&from=876277922",
  "[九转大肠]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ea89e25c77dd423d8403d20740f23bb7?lk3s=343af0a2&x-expires=2110381200&x-signature=YCc5WE2DYEBFX5TqJFbkXogLpNw%3D&from=876277922",
  "[不你不想]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/b4845baf417a404488e955464208cc3c?lk3s=343af0a2&x-expires=2110381200&x-signature=X8Rb0IgJIEkH6PGp1Ksr2OE3CaQ%3D&from=876277922",
  "[一头乱麻]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/db393c6b9bba40f3b37d4e079d1cbf1e?lk3s=343af0a2&x-expires=2110381200&x-signature=r9zoWWMQaFM%2F9fnkAVOP5H9vRtY%3D&from=876277922",
  "[kisskiss]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/f971f6f859b24829a15196c5a0738df1?lk3s=343af0a2&x-expires=2110381200&x-signature=37R1r8SQ%2Fuoc%2F5xWCXQ%2FcV1d9EY%3D&from=876277922",
  "[你不大行]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/0f2d07ea48a94bf0a57818056392bb42?lk3s=343af0a2&x-expires=2110381200&x-signature=bNR4L6OK7kwtCC6xPruxPX7aYy0%3D&from=876277922",
  "[噢买尬]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/af75834bf58e44c88b1825f85d50b7da?lk3s=343af0a2&x-expires=2110381200&x-signature=TxRBphlPy2rft%2BRmmKbUKFGE94E%3D&from=876277922",
  "[宕机]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/561341b97e7844148b6f040241357122?lk3s=343af0a2&x-expires=2110381200&x-signature=a2dLCWCundy4Qg92IGgvu%2B4Dvvg%3D&from=876277922",
  "[苦涩]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e72ce46a6ab640b38c7686f4b77fb7e4?lk3s=343af0a2&x-expires=2110381200&x-signature=5AL6aQxQNKnhCGb1GwsCjY2rNfA%3D&from=876277922",
  "[逞强落泪]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/67b9bcd2e1d64888bf57fa433e5b4717?lk3s=343af0a2&x-expires=2110381200&x-signature=w22FGgR67t4PAGYT8MwCFaXAYMs%3D&from=876277922",
  "[求机位-黄脸]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/66e8109018b64af1b87ce68ff2bfc18e?lk3s=343af0a2&x-expires=2110381200&x-signature=bd0WYPUcphQckpbOZIovHoRtelo%3D&from=876277922",
  "[求机位3]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ec3d99650c114cb49f22cda9ce06d25f?lk3s=343af0a2&x-expires=2110381200&x-signature=w6YgaNk0zkNTDgSRzJBuFXafT%2FA%3D&from=876277922",
  "[点赞]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/8e7e1b35d32b4623a0240552dc784b0f?lk3s=343af0a2&x-expires=2110381200&x-signature=uaxPbHq1jY8VmIqwzEyCFxWhbUE%3D&from=876277922",
  "[精选]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/8d72402dd91a4a3a8cf4591b266ddb14?lk3s=343af0a2&x-expires=2110381200&x-signature=SNgUeFirQuU0zlIU9emtd9H%2BzwI%3D&from=876277922",
  "[强壮]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/41a493d326e7475fb8f1ef0c614dbf25?lk3s=343af0a2&x-expires=2110381200&x-signature=NXb2dt5PwCr91YWrK4novpPS97Q%3D&from=876277922",
  "[碰拳]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/2bba2a8b361e467288d796c1581fec60?lk3s=343af0a2&x-expires=2110381200&x-signature=gX9lRW8v%2BCfdaUlpefmQVPhJ6ME%3D&from=876277922",
  "[OK]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/28dd2b330ea74d4cac2388f617177fe1?lk3s=343af0a2&x-expires=2110381200&x-signature=nnWEZbvQeR4l1CufmbDM2tUtNiM%3D&from=876277922",
  "[击掌]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d3f83268e073468fbe8759638beb42ef?lk3s=343af0a2&x-expires=2110381200&x-signature=Lfn53Ez1j08i3wCdvnwawbFiLcA%3D&from=876277922",
  "[左上]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/cf670dd2a4c2487181ee834aa0b048fa?lk3s=343af0a2&x-expires=2110381200&x-signature=4TRmOY%2BqexX2Ba1rjVOHwf7SRo8%3D&from=876277922",
  "[握手]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/4550a48b841144d7b37fff3d02ec8a25?lk3s=343af0a2&x-expires=2110381200&x-signature=rRWY0ELNzxFm0xkekVLbw6v1vuk%3D&from=876277922",
  "[抱拳]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/5c6a7e331b7441ecb615e0adab43935a?lk3s=343af0a2&x-expires=2110381200&x-signature=oprGpg0GFo2S2qkDBVxfz7hZAdY%3D&from=876277922",
  "[勾引]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/6db49f314c1d4754a8205c3231edd396?lk3s=343af0a2&x-expires=2110381200&x-signature=ZBE4cwBQx8rxeqUJkul3tbdkeEQ%3D&from=876277922",
  "[拳头]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/5bede8c4134b4be798c924faee784650?lk3s=343af0a2&x-expires=2110381200&x-signature=HMKhIArJ%2B2eBWETxe9WCaQjFhgw%3D&from=876277922",
  "[弱]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/5028f8d3638a488b987008c384745afc?lk3s=343af0a2&x-expires=2110381200&x-signature=99xjp%2BPJ9o0k2BDnVQ%2FhBGk%2B%2B0E%3D&from=876277922",
  "[胜利]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/85abaf2fa4b940879a7b3bfdb45c3299?lk3s=343af0a2&x-expires=2110381200&x-signature=Qqd2N3r%2FxJWhmw90%2FdaagG8%2FDMs%3D&from=876277922",
  "[右边]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/11aadc9ed7b643279c38f94e8ed347c0?lk3s=343af0a2&x-expires=2110381200&x-signature=yzXWvzACdyKlsumXAt7qo7pNWlc%3D&from=876277922",
  "[左边]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/bed344e70c214bf281db6a7944ef909a?lk3s=343af0a2&x-expires=2110381200&x-signature=6%2B1P0LNw6ADuddbltpV1B0hZRPo%3D&from=876277922",
  "[嘴唇]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/b1b3824e7b6c482b8d52b1c3b5577849?lk3s=343af0a2&x-expires=2110381200&x-signature=JnG5PWO05UZ9PHydk1c9NcqSFtg%3D&from=876277922",
  "[心碎]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/371bb866809f454597ef538f604bd25a?lk3s=343af0a2&x-expires=2110381200&x-signature=k8Wzl3%2BDJXtcz9Tgjo3gr%2F71prg%3D&from=876277922",
  "[凋谢]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c93a47ad594b4be3a8c288aff0d7543b?lk3s=343af0a2&x-expires=2110381200&x-signature=%2Bc05To%2FXJjIQMlMLzcnKEVDuI%2BE%3D&from=876277922",
  "[愤怒]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/6dd1d010b5fd4f5197c1ecad3ce6796b?lk3s=343af0a2&x-expires=2110381200&x-signature=PzHqEzSDP91ZMoXvVPK92WdlZR0%3D&from=876277922",
  "[垃圾]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/d7d09280091445aabfd912bcca4d9a89?lk3s=343af0a2&x-expires=2110381200&x-signature=9UYUyFCp24g%2BI989hM0nsufM7Zw%3D&from=876277922",
  "[啤酒]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/a8ae1c4c2e0f467dbff1ba0964e0175d?lk3s=343af0a2&x-expires=2110381200&x-signature=IJX93Bt1fzBPbyfLW%2Bb4nGRvd50%3D&from=876277922",
  "[咖啡]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/dcbcf5d7ca07490a950a37ff66a5be74?lk3s=343af0a2&x-expires=2110381200&x-signature=s0jOL0cJH96w8bvkY7UP1cGLT7g%3D&from=876277922",
  "[蛋糕]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/1153a12fbb514977b3a5349d3dcc509b?lk3s=343af0a2&x-expires=2110381200&x-signature=Y7fKkQzb0R5vELqTVs1Vjrgwg4Y%3D&from=876277922",
  "[礼物]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e8e086e0f6544f9b87117abebd96e840?lk3s=343af0a2&x-expires=2110381200&x-signature=IdjXedMwH%2BsoaoRHTY4PxkP%2B%2B%2BM%3D&from=876277922",
  "[撒花]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/8cefd1b8c16b412298657b6e1d81f8ab?lk3s=343af0a2&x-expires=2110381200&x-signature=bSQSWhADUH4RCy4IiAU59Ki9Hkc%3D&from=876277922",
  "[加一]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/496076e82fd74be793ab16d2940e8f8c?lk3s=343af0a2&x-expires=2110381200&x-signature=8CV1KXSxp%2F%2BiH2U0mGIdEcn28JM%3D&from=876277922",
  "[减一]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ffc25006163e4ecfa70968744d1be61e?lk3s=343af0a2&x-expires=2110381200&x-signature=dAc%2B2oslFwrA8PjaOQRK%2F4OSQ10%3D&from=876277922",
  "[okk]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/9309aa3f9bed475b88538346f56fc6e6?lk3s=343af0a2&x-expires=2110381200&x-signature=OtHqjosVURLlWCsYN5KV%2FmFgPGU%3D&from=876277922",
  "[V5]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/cddffb522b2d421d81eb9da0f7f3cbb1?lk3s=343af0a2&x-expires=2110381200&x-signature=OoIcj645COcTot5b%2BNlKvX0q3ig%3D&from=876277922",
  "[绝]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/f1e1a02468b7420c841733c780ec2576?lk3s=343af0a2&x-expires=2110381200&x-signature=Texgwmc0bhYZLfuxZFZ2K%2F6gazg%3D&from=876277922",
  "[给力]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/5387fc1361634b579946fbac7c4ea5f4?lk3s=343af0a2&x-expires=2110381200&x-signature=%2BraSveZ03Gcj2IiRNlbhpHYl74E%3D&from=876277922",
  "[红包]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/3e78d79aa4964404bb78b445f34c78fd?lk3s=343af0a2&x-expires=2110381200&x-signature=W%2FINqcsCbf6SXFyBpObAYXyAoeE%3D&from=876277922",
  "[屎]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/eae0730620d644bdbb91985bd9cfff4e?lk3s=343af0a2&x-expires=2110381200&x-signature=dte6PhMth14c4Dw07Je2EOXza7E%3D&from=876277922",
  "[发]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ee4f3e944a62429e8e963bd187d00536?lk3s=343af0a2&x-expires=2110381200&x-signature=5HtyB7VGNOZr987MxxmdNcDeLPc%3D&from=876277922",
  "[18禁]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/40724dd5538c474693ec54d34a14c613?lk3s=343af0a2&x-expires=2110381200&x-signature=hStF4ggJ%2BPdWqKQ0rslV0SX5ZTU%3D&from=876277922",
  "[炸弹]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/a309a1e9a10049d88b1c9848f5f7b287?lk3s=343af0a2&x-expires=2110381200&x-signature=6ewFhVlMlqhqbwypGyW%2FMLnGVhM%3D&from=876277922",
  "[西瓜]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/39ca333313da4187bd5651a5404aed26?lk3s=343af0a2&x-expires=2110381200&x-signature=0A1s2X%2FlfC3cANZokTlRB4t2QVQ%3D&from=876277922",
  "[加鸡腿]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/1391aac43d004af986f2202f43253f94?lk3s=343af0a2&x-expires=2110381200&x-signature=K51GhFhsGjh8h4ol293i8lIMiO8%3D&from=876277922",
  "[握爪]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/966210d6153146e8b58686aa1cc763ca?lk3s=343af0a2&x-expires=2110381200&x-signature=N5bEnetaCzPyNT99KBlesWGCdwo%3D&from=876277922",
  "[太阳]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/5c9e5b67fc524f14b4ae49b5977afd9d?lk3s=343af0a2&x-expires=2110381200&x-signature=mifdWyOef53xq%2BcRWaScJxjcfkg%3D&from=876277922",
  "[月亮]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/cfa03e7f7b534eb2a9bc16fec54ed23f?lk3s=343af0a2&x-expires=2110381200&x-signature=qp%2FKOWYdWRvEWeffXw%2Fb24%2BwG1A%3D&from=876277922",
  "[给跪了]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/21d2a8bbe630496d88c03fa9179b17cb?lk3s=343af0a2&x-expires=2110381200&x-signature=5Oa6TVFwr94bP7cc5OlmomcSHHE%3D&from=876277922",
  "[蕉绿]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ac2d04da5bf54c8bb12628510d8718ba?lk3s=343af0a2&x-expires=2110381200&x-signature=pKtNuIQqc3sJI%2BVbPTbderNnZu4%3D&from=876277922",
  "[扎心]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e6121879b6de4bd08d35a312574f6563?lk3s=343af0a2&x-expires=2110381200&x-signature=jn5fg39drWXQ%2BLztPiv2t3hGuLw%3D&from=876277922",
  "[胡瓜]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/5f3bb76347cd49e4935300b507353f68?lk3s=343af0a2&x-expires=2110381200&x-signature=SjhYAXf%2B5DkSzylMduaP0T92E84%3D&from=876277922",
  "[打call]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/31a1efcf7c97414fae43d1d08058b0ee?lk3s=343af0a2&x-expires=2110381200&x-signature=G9xHz9C4UdCkEcEgCG1OsFPIvaU%3D&from=876277922",
  "[栓Q]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/a948fa11ae344a1d91276235ab6bf70b?lk3s=343af0a2&x-expires=2110381200&x-signature=brBV%2FOmI%2BOGz%2FrLaKs6CvHwKe4A%3D&from=876277922",
  "[雪花]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/5144febc02ad42c082b83980d9159e13?lk3s=343af0a2&x-expires=2110381200&x-signature=bCTl55GhiuyKx1w8rRQrTB9n2G8%3D&from=876277922",
  "[圣诞树]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/9d3184f19a0042f2886922fd6d1b6823?lk3s=343af0a2&x-expires=2110381200&x-signature=r1GCJTagSFM0QlysgfnYT5SvjjM%3D&from=876277922",
  "[平安果]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/0855a7b63f1f437db4eaa3519d5dd4d5?lk3s=343af0a2&x-expires=2110381200&x-signature=ESSDXcuOKqfPi%2F18E8u92mI0tNs%3D&from=876277922",
  "[圣诞帽]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/71d0ea5435d443519eafc2d72eee07c7?lk3s=343af0a2&x-expires=2110381200&x-signature=zswgjNfYGuBrDq7RitmGSrZEJ2E%3D&from=876277922",
  "[气球]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/2eb779c7734345979bd3f866989a167f?lk3s=343af0a2&x-expires=2110381200&x-signature=oF9%2BAIAgPh%2FMkoQ04kPlZEcCjDg%3D&from=876277922",
  "[烟花]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/e679017985b54d19b23668fc3437a1a1?lk3s=343af0a2&x-expires=2110381200&x-signature=zO9JLD6pyIMnUE6LKacPJ0s6ZLg%3D&from=876277922",
  "[福]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c5dd439d89754e4aa6c553a244aacc4b?lk3s=343af0a2&x-expires=2110381200&x-signature=4VZEddyNqWoC0fZomyE%2F9oZYbXU%3D&from=876277922",
  "[candy]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/cce110c8f9f74a898a21ab413fb6cc63?lk3s=343af0a2&x-expires=2110381200&x-signature=O2xlPnIQwWLEaTVfhdEX7RTj3M8%3D&from=876277922",
  "[糖葫芦]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/f99e62388e6c4553974f1fe44f602456?lk3s=343af0a2&x-expires=2110381200&x-signature=bAPAnsGr8tUixamnmsEeduCTNrc%3D&from=876277922",
  "[鞭炮]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/237a828fd0964b2b9510c15de33383ad?lk3s=343af0a2&x-expires=2110381200&x-signature=z0aI5zfBDyYGvvmhNBb8ggwu4ko%3D&from=876277922",
  "[元宝]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/6c0ebb50021a4b9e84cb5908be4eb5ef?lk3s=343af0a2&x-expires=2110381200&x-signature=6TbO9xuM6WtRMhTOXWQ%2FBhY4F6M%3D&from=876277922",
  "[灯笼]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/a7a43e8805fc425990fed26d8be5b7b6?lk3s=343af0a2&x-expires=2110381200&x-signature=%2F8KC%2BNc0If465zqm35rvTM1cpEk%3D&from=876277922",
  "[锦鲤]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/f88e3e8d639b438aaa084549086fbb46?lk3s=343af0a2&x-expires=2110381200&x-signature=uaVz9wVZEhwSONwBbvog8J6zp6w%3D&from=876277922",
  "[巧克力]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c6db9180292c47779624a865d80f67e7?lk3s=343af0a2&x-expires=2110381200&x-signature=aYNIL%2B5fcykyZrZaIy5osvYQB8A%3D&from=876277922",
  "[戒指]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/f8eb6c5b5d6640cc82de8ecd4acd33d0?lk3s=343af0a2&x-expires=2110381200&x-signature=LB2go14RVtffKmPEU7Y9T4JzNeA%3D&from=876277922",
  "[棒棒糖]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/38fd079e306a40e4953bdf4a5d8a16db?lk3s=343af0a2&x-expires=2110381200&x-signature=92EWAuFw6IdwJe7a2%2FJbpOWOKW8%3D&from=876277922",
  "[纸飞机]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/c0e6de9ee9d646d0a0d01831f3870787?lk3s=343af0a2&x-expires=2110381200&x-signature=UlAHNl9dypm6vRb4uKCCKxIGfn8%3D&from=876277922",
  "[粽子]": "https://p3-pc-sign.douyinpic.com/obj/tos-cn-i-tsj2vxp0zn/ce5e59e1376d440b98bb738c90e1a6e1?lk3s=343af0a2&x-expires=2110381200&x-signature=gjurXBCwu8%2BYBwUj%2F8itWRZx9Jk%3D&from=876277922"
});

/** Parse Douyin aweme/v1/web/emoji/list response into { "[name]": "https://..." }. */
export function parseDouyinEmojiListResponse(json, validateUrl = defaultValidateUrl) {
  const out = {};
  const list = Array.isArray(json?.emoji_list) ? json.emoji_list : [];
  for (const item of list) {
    const name = String(item?.display_name || '').trim();
    if (!/^\[[^\[\]\s]{1,24}\]$/.test(name)) continue;
    const candidates = Array.isArray(item?.emoji_url?.url_list) ? item.emoji_url.url_list : [];
    for (const cand of candidates) {
      const safe = validateUrl(cand);
      if (safe) {
        out[name] = safe;
        break;
      }
    }
  }
  return out;
}

/** Split text containing Douyin [emoji] shortcodes into unified render segments. */
export function tokenizeDouyinTextWithEmojis(text, emojiMap = DEFAULT_DOUYIN_EMOJIS) {
  const str = String(text || '');
  if (!str) return [];
  const map = emojiMap && typeof emojiMap === 'object' ? emojiMap : DEFAULT_DOUYIN_EMOJIS;
  const parts = str.split(/(\[[^\[\]\s]{1,24}\])/g);
  const segments = [];
  let textBuf = '';

  const flushText = () => {
    if (textBuf) {
      segments.push({ type: 'text', text: textBuf });
      textBuf = '';
    }
  };

  for (const part of parts) {
    if (!part) continue;
    if (part[0] === '[' && part[part.length - 1] === ']' && Object.prototype.hasOwnProperty.call(map, part)) {
      const url = map[part];
      if (url) {
        flushText();
        segments.push({ type: 'emote', url, alt: part });
        continue;
      }
    }
    textBuf += part;
  }
  flushText();
  return segments;
}

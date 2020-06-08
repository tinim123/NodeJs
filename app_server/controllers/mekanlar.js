var request = require('request');
var express = require('express');
var router = express.Router();

var apiSecenekleri = {
  sunucu : "http://localhost:3000",
  apiYolu: '/api/mekanlar/'
}


var mesafeyiFormatla = function (mesafe) {
  var yeniMesafe, birim;
  if (mesafe> 1000) {
    yeniMesafe= parseFloat(mesafe/1000).toFixed(2);
    birim = ' km';
  } else {
    yeniMesafe = parseFloat(mesafe).toFixed(1);
    birim = ' m'; 
  }
    return yeniMesafe + birim;
  }

  var anaSayfaOlustur = function(req, res,cevap, mekanListesi){
  var mesaj;
//Gelen mekanListesi eğer dizi tipinde değilse hata ver.
if (!(mekanListesi instanceof Array)) {
  mesaj = "API HATASI: Birşeyler ters gitti";
  mekanListesi = [];
} else {//Eğer belirlenen mesafe içinde mekan bulunamadıysa bilgilendir
  if (!mekanListesi.length) {
    mesaj = "Civarda Herhangi Bir Mekan Bulunamadı!";
  }
}
res.render('mekanlar-liste', 
  { 
  baslik: 'Mekan32',
  sayfaBaslik:{
    siteAd:'Mekan32',
    aciklama:'Isparta Civarındaki Mekanları Keşfedin!'
  },
  mekanlar:mekanListesi,
  mesaj: mesaj,
  cevap:cevap
});
}

const anaSayfa=function(req,res){
    istekSecenekleri = 
    {//tam yol
    url : apiSecenekleri.sunucu + apiSecenekleri.apiYolu,
    //Veri çekeceğimiz için GET metodunu kullan
    method : "GET",
    //Dönen veri json formatında olacak
    json : {},
    //Sorgu parametreleri.URL'de yazılan enlem boylamı al
    //localhost:3000/?enlem=37&boylam=30 gibi
    qs : {
      enlem :  req.query.enlem,
      boylam : req.query.boylam
    }
  };//istekte bulun
  request(
    istekSecenekleri,
    //geri dönüş metodu
    function(hata, cevap, mekanlar) {
      var i, gelenMekanlar;
      gelenMekanlar = mekanlar;
      //Sadece 200 durum kodunda ve mekanlar doluyken işlem yap
      if (!hata && gelenMekanlar.length) {
        for (i=0; i<gelenMekanlar.length; i++) {
          gelenMekanlar[i].mesafe = 
          mesafeyiFormatla(gelenMekanlar[i].mesafe);
        }
      }
      anaSayfaOlustur(req, res, cevap,gelenMekanlar);
    } 
  );
}



var detaySayfasiOlustur = function(req, res,mekanDetaylari){
 res.render('mekan-detay', 
 { 
  baslik: mekanDetaylari.ad,
  sayfaBaslik: mekanDetaylari.ad,
  mekanBilgisi:mekanDetaylari
});
}

var hataGoster = function(req, res,durum){
  var baslik,icerik;
  if(durum==404){
    baslik="404, Sayfa Bulunamadı!";
    icerik="Kusura bakma sayfayı bulamadık!";
  }
  else{
     baslik=durum+", Birşeyler ters gitti!";
     icerik="Ters giden birşey var!";
  }
 res.status(durum);
 res.render('error',{
    baslik:baslik,
    icerik:icerik
 });
};

var mekanBilgisiGetir = function (req, res, callback) {
  //istek seçeneklerini ayarla.
  istekSecenekleri = {
    //tam yol
    url : apiSecenekleri.sunucu + apiSecenekleri.apiYolu + req.params.mekanid,
    //Veri çekeceğimiz için GET metodunu kullan
    method : "GET",
    //Dönen veri json formatında olacak
    json : {}
  };//istekte bulun
  request(
    istekSecenekleri,
    //geri dönüş metodu
    function(hata, cevap, mekanDetaylari) {
      var gelenMekan = mekanDetaylari;
      //mesaj kısmının var olmaması mekanın bulunduğuna işarettir.
      //eğer olmayan bir id ye sorgu yapılırsa hata mesajının içeriği dolacaktır.
      if (cevap.statusCode==200) {

        //enlem ve boylam bir dizi şeklinde bunu ayır. 
        //0'da enlem 1 de boylam var
        gelenMekan.koordinatlar = {
          enlem : mekanDetaylari.koordinatlar[0],
          boylam : mekanDetaylari.koordinatlar[1]
        };
        callback(req, res,gelenMekan);

      } else {
        hataGoster(req, res, cevap.statusCode);
      }
    }
    ); 
};

var mekanBilgisi = function (req, res, callback) {
  mekanBilgisiGetir(req,res,function(req,res,cevap){
    detaySayfasiOlustur(req,res,cevap);
  });
}

var yorumSayfasiOlustur = function(req, res,mekanBilgisi){
 res.render('yorum-ekle', {
    'baslik':mekanBilgisi.ad+' Mekanına Yorum Ekle',
    'sayfaBaslik':mekanBilgisi.ad+' Mekanına Yorum Ekle',
    'hata':req.query.hata
});
}

const yorumEkle=function(req, res, next) {
 mekanBilgisiGetir(req,res,function(req,res,cevap){
  yorumSayfasiOlustur(req,res,cevap);
 });
}

const yorumumuEkle = function(req, res){
  var istekSecenekleri, gonderilenYorum,mekanid;
  mekanid=req.params.mekanid;
  gonderilenYorum = {
    yorumYapan: req.body.name,
    puan: parseInt(req.body.rating, 10),
    yorumMetni: req.body.review
  };
  istekSecenekleri = {
    url : apiSecenekleri.sunucu+ apiSecenekleri.apiYolu+mekanid+'/yorumlar',
    method : "POST",
    json : gonderilenYorum
  };
  if (!gonderilenYorum.yorumYapan || !gonderilenYorum.puan || !gonderilenYorum.yorumMetni) {
    res.redirect('/mekan/' + mekanid + '/yorum/yeni?hata=evet'); 
  } else { 
    request(
      istekSecenekleri,
      function(hata, cevap, body) {
        if (cevap.statusCode === 201) {
          res.redirect('/mekan/' + mekanid);
        } 
        else if (cevap.statusCode === 400 && body.name && body.name ==="ValidationError" ) {
          res.redirect('/mekan/' + mekanid + '/yorum/yeni?hata=evet'); 
        }
        else {
          hataGoster(req, res, cevap.statusCode);
        } 
      }
      );
    }
  };

module.exports = {anaSayfa,mekanBilgisi,yorumEkle,yorumumuEkle};

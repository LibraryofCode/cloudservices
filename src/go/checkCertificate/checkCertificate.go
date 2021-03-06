// ignore this error
package main

import (
	"crypto/sha1"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"os"
)

// HandleError handles an error by panicing.
func HandleError(e error) {
	if e != nil {
		panic(e)
	}
}

func main() {
	type CertificateAbstract struct {
		EmailAddress       string
		SignatureAlgorithm string
		PublicKeyAlgorithm string
		ExtendedKeyUsage   []string
		PolicyIdentifiers  []string
		SerialNumber       string
		FingerPrint        string
	}
	type CompleteCertificate struct {
		XMLName       xml.Name `xml:"CertificateParse"`
		RawParse      *x509.Certificate
		AbstractParse CertificateAbstract
	}
	certificateFile, err := ioutil.ReadFile(os.Args[1])
	HandleError(err)
	certificatePemDecode, _ := pem.Decode(certificateFile)
	if certificatePemDecode == nil {
		panic("Certificate PEM Encode == nil")
	}
	certificateParse, err := x509.ParseCertificate(certificatePemDecode.Bytes)
	HandleError(err)
	policyIdentifiers := []string{}
	extendedKeyUsages := []string{}
	var emailAddress interface{}
	for _, value := range certificateParse.Subject.Names {
		if value.Type.String() == "1.2.840.113549.1.9.1" {
			emailAddress = value.Value
		}
	}
	for _, value := range certificateParse.PolicyIdentifiers {
		policyIdentifiers = append(policyIdentifiers, value.String())
	}
	for _, value := range certificateParse.ExtKeyUsage {
		switch value {
		case 0:
			extendedKeyUsages = append(extendedKeyUsages, "All/Any Usages")
			break
		case 1:
			extendedKeyUsages = append(extendedKeyUsages, "TLS Web Server Authentication")
			break
		case 2:
			extendedKeyUsages = append(extendedKeyUsages, "TLS Web Client Authentication")
			break
		case 3:
			extendedKeyUsages = append(extendedKeyUsages, "Code Signing")
			break
		case 4:
			extendedKeyUsages = append(extendedKeyUsages, "E-mail Protection (S/MIME)")
		default:
			break
		}
	}
	sum := sha1.Sum(certificateParse.Raw)
	certificateStruct := CompleteCertificate{
		RawParse: certificateParse,
		AbstractParse: CertificateAbstract{
			EmailAddress:       fmt.Sprintf("%s", emailAddress),
			SignatureAlgorithm: certificateParse.SignatureAlgorithm.String(),
			PublicKeyAlgorithm: certificateParse.PublicKeyAlgorithm.String(),
			PolicyIdentifiers:  policyIdentifiers,
			ExtendedKeyUsage:   extendedKeyUsages,
			SerialNumber:       certificateParse.SerialNumber.String(),
			FingerPrint:        hex.EncodeToString(sum[:]),
		},
	}
	if len(os.Args) >= 3 {
		if os.Args[2] == "json" {
			data, err := json.MarshalIndent(certificateStruct, "", " ")
			HandleError(err)
			fmt.Printf("%v\n", string(data))
		} else if os.Args[2] == "xml" {
			data, err := xml.MarshalIndent(certificateStruct, "", " ")
			HandleError(err)
			fmt.Printf("%v\n", string(data))
		}
	} else {
		data, err := json.MarshalIndent(certificateStruct, "", " ")
		HandleError(err)
		fmt.Printf("%v\n", string(data))
	}
}

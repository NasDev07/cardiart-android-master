#!/usr/bin/env python3
import sys
import argparse
import json
from xml.etree.ElementTree import parse, fromstring

def show_usage():
    print('Usage:')
    print('python3 ecgXmlToJson.py -i "input.xml" -o output.json')
    sys.exit(0)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-i', '--file_input', help="intput xml file")
    parser.add_argument('-o', '--file_output', help="output json file")
    args = parser.parse_args()

    if len(sys.argv) != 5:
        show_usage()
        return

    outputData = {
        'MinnesCode':'',
        'UV':'1000',
        'Duration':'10'
    }

    # parse from a string directly
    data = ''
    with open(args.file_input, 'r') as fp:
        data = fp.read()
    root = fromstring(data)

    # parse from file
    # doc = parse(args.file_input)
    # root = doc.getroot()

    # patient_sex = root.find('PatientInfo/PatientSEX').text
    # if patient_sex is None:
    #     patient_sex = ''
    # outputData['Sex'] = patient_sex

    # patient_age = root.find('PatientInfo/PatientAge').text
    # if patient_age is None:
    #     patient_age = ''
    # outputData['Age'] = patient_age

    sample_rate = root.find('StudyInfo/SampleRate').text
    outputData['SampleRate'] = sample_rate

    ch = ''
    for item in root.find('StudyInfo/RecordData'):
        # print(item)
        if item.tag == 'Channel':
            ch = item.text
        elif item.tag == 'Waveform':
            data = item.find('PureData').text
            outputData[ch] = data
    # print(outputData)

    ret = json.dumps(outputData)
    # print(ret)
    with open(args.file_output, 'w') as fp:
        fp.write(ret)

if __name__ == "__main__":
    main()

title 'SSM Parameters and Secrets Manager Secrets'

control 'Parameter Store Values' do
  # A unique ID for this control
  impact 0.7 # The criticality, if this control fails.
  title 'Verify that parameter values exist'
  desc 'Checks that the SSM parameters are setup correctly'

  describe aws_ssm_parameter(name: '/config/shared/jdbc/hostname') do
    it { should exist }
    its('type') { should eq 'String' }
    its('data_type') { should eq 'text' }
    its('value') { should_not eq nil }
  end

  describe aws_ssm_parameter(name: '/config/shared/jdbc/reader-hostname') do
    it { should exist }
    its('type') { should eq 'String' }
    its('data_type') { should eq 'text' }
    its('value') { should_not eq nil }
  end

  describe aws_ssm_parameter(name: '/config/shared/jdbc/port') do
    it { should exist }
    its('type') { should eq 'String' }
    its('data_type') { should eq 'text' }
    its('value') { should_not eq nil }
  end

  describe aws_ssm_parameter(name: '/config/shared/jdbc/url') do
    it { should exist }
    its('type') { should eq 'String' }
    its('data_type') { should eq 'text' }
    its('value') { should_not eq nil }
  end
end

# At present, inspec-aws does not support Secrets Manager directly, thus, we use the Secrets Manager reference
# via Parameter Store:
# https://docs.aws.amazon.com/systems-manager/latest/userguide/integration-ps-secretsmanager.html
# Since the secretName uses paths in order to work with Spring Cloud AWS, we need a double slash
# in the name value. As will all secrets manager secrets referenced via SSM, you need to pass
# with_decryption: "true" always.
control 'SecretsManager Values' do
  impact 0.9
  title 'Verify that secrets exist'
  desc 'Verifies that SecretsManager values exist '

  describe aws_ssm_parameter(
             name: '/aws/reference/secretsmanager//secret/mysql/admin',
             with_decryption: 'true'
           ) do
    it { should exist }
    its('type') { should eq 'SecureString' }
    its('value') { should_not eq nil }
  end

  describe aws_ssm_parameter(
             name: '/aws/reference/secretsmanager//secret/demoapp/appuser',
             with_decryption: 'true'
           ) do
    it { should exist }
    its('type') { should eq 'SecureString' }
    its('value') { should_not eq nil }
  end
end
